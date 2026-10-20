import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('UC06 — API et transaction PostgreSQL (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  const endpoint = '/api/assignments/confirm';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true, forbidNonWhitelisted: true, transform: true,
    }));
    await app.init();
    db = app.get(DataSource);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(async () => {
    // Base dédiée aux tests : efface les données de démonstration.
    await db.query('TRUNCATE TABLE campaigns, teachers, students CASCADE');
  });

  async function campaign(): Promise<string> {
    const id = randomUUID();
    await db.query('INSERT INTO campaigns (id, title) VALUES ($1, $2)', [id, 'PFA de test']);
    return id;
  }
  async function teacher(campaignId: string, maxPfa: number): Promise<string> {
    const id = randomUUID();
    await db.query('INSERT INTO teachers (id, name) VALUES ($1, $2)', [id, 'Enseignant test']);
    await db.query(
      'INSERT INTO teacher_capacities (teacher_id, campaign_id, max_pfa) VALUES ($1,$2,$3)',
      [id, campaignId, maxPfa],
    );
    return id;
  }
  async function student(): Promise<string> {
    const id = randomUUID();
    await db.query('INSERT INTO students (id, name) VALUES ($1,$2)', [id, 'Étudiant test']);
    return id;
  }
  async function group(campaignId: string, students: string[], confirmed = true): Promise<string> {
    const id = randomUUID();
    await db.query('INSERT INTO pfa_groups (id,campaign_id,name) VALUES ($1,$2,$3)',
      [id, campaignId, 'Groupe test']);
    for (const studentId of students) {
      await db.query(
        'INSERT INTO group_members (group_id,student_id,confirmed_at) VALUES ($1,$2,$3)',
        [id, studentId, confirmed ? new Date() : null],
      );
    }
    return id;
  }
  async function application(
    campaignId: string,
    teacherId: string,
    groupId: string,
    status = 'FAVORABLE',
    subjectId: string | null = null,
  ): Promise<string> {
    const id = randomUUID();
    await db.query(
      `INSERT INTO applications (id,campaign_id,teacher_id,group_id,subject_id,project_title,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, campaignId, teacherId, groupId, subjectId, 'Projet test', status],
    );
    return id;
  }
  function confirm(id: string) {
    return request(app.getHttpServer()).post(endpoint).send({ applicationId: id });
  }
  async function count(table: 'assignments' | 'assignment_members'): Promise<number> {
    const rows = await db.query(`SELECT COUNT(*)::int AS value FROM ${table}`) as Array<{value: number}>;
    return Number(rows[0].value);
  }

  it('affecte atomiquement tous les membres d’un groupe et marque la candidature', async () => {
    const c = await campaign();
    const t = await teacher(c, 2);
    const s1 = await student();
    const s2 = await student();
    const g = await group(c, [s1, s2]);
    const a = await application(c, t, g);

    const response = await confirm(a).expect(201);
    expect(response.body.status).toBe('AFFECTEE');
    expect(response.body.memberIds.sort()).toEqual([s1, s2].sort());
    expect(await count('assignments')).toBe(1);
    expect(await count('assignment_members')).toBe(2);
    const rows = await db.query('SELECT status FROM applications WHERE id = $1', [a]) as Array<{status: string}>;
    expect(rows[0].status).toBe('AFFECTEE');
  });

  it('ne valide qu’une candidature lorsque deux confirmations disputent la dernière place', async () => {
    const c = await campaign();
    const t = await teacher(c, 1);
    const g1 = await group(c, [await student()]);
    const g2 = await group(c, [await student()]);
    const a1 = await application(c, t, g1);
    const a2 = await application(c, t, g2);

    const responses = await Promise.all([confirm(a1), confirm(a2)]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await count('assignments')).toBe(1);
    expect(await count('assignment_members')).toBe(1);
  });

  it('empêche la double affectation d’un étudiant par deux enseignants concurrents', async () => {
    const c = await campaign();
    const t1 = await teacher(c, 2);
    const t2 = await teacher(c, 2);
    const sameStudent = await student();
    const g1 = await group(c, [sameStudent]);
    const g2 = await group(c, [sameStudent]);
    const a1 = await application(c, t1, g1);
    const a2 = await application(c, t2, g2);

    const responses = await Promise.all([confirm(a1), confirm(a2)]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await count('assignments')).toBe(1);
    expect(await count('assignment_members')).toBe(1);
  });

  it('refuse une candidature non favorable et conserve la base intacte', async () => {
    const c = await campaign();
    const t = await teacher(c, 1);
    const g = await group(c, [await student()]);
    const a = await application(c, t, g, 'EN_ATTENTE');
    await confirm(a).expect(409);
    expect(await count('assignments')).toBe(0);
  });

  it('refuse un groupe dont un membre n’a pas confirmé sa participation', async () => {
    const c = await campaign();
    const t = await teacher(c, 1);
    const g = await group(c, [await student(), await student()], false);
    const a = await application(c, t, g);
    await confirm(a).expect(409);
    expect(await count('assignments')).toBe(0);
  });

  it('refuse de confirmer deux fois la même candidature', async () => {
    const c = await campaign();
    const t = await teacher(c, 2);
    const g = await group(c, [await student()]);
    const a = await application(c, t, g);
    await confirm(a).expect(201);
    await confirm(a).expect(409);
    expect(await count('assignments')).toBe(1);
  });

  it('valide le DTO avant d’accéder aux données', async () => {
    await request(app.getHttpServer())
      .post(endpoint)
      .send({ applicationId: 'pas-un-uuid' })
      .expect(400);
  });
});
