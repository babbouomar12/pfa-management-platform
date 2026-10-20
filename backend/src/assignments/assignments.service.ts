import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException, HttpException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { Application } from '../database/entities/application.entity';
import { Assignment } from '../database/entities/assignment.entity';
import { AssignmentMember } from '../database/entities/assignment-member.entity';
import { GroupMember } from '../database/entities/group-member.entity';
import { PfaGroup } from '../database/entities/pfa-group.entity';
import { Student } from '../database/entities/student.entity';
import { Subject } from '../database/entities/subject.entity';
import { TeacherCapacity } from '../database/entities/teacher-capacity.entity';
import { allMembersConfirmed, capacityReached } from './assignment-policy';

export interface ConfirmedAssignment {
  assignmentId: string;
  applicationId: string;
  campaignId: string;
  teacherId: string;
  memberIds: string[];
  status: 'AFFECTEE';
}

@Injectable()
export class AssignmentsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async confirm(applicationId: string): Promise<ConfirmedAssignment> {
    try {
      return await this.db.transaction('READ COMMITTED', async (manager) => {
        // Première lecture pour connaître le quota à verrouiller ; les données
        // critiques sont relues / validées après verrouillage ci-dessous.
        const preliminary = await manager.getRepository(Application).findOne({
          where: { id: applicationId },
        });
        if (!preliminary) {
          throw new NotFoundException('Candidature introuvable.');
        }

        // Point de sérialisation des décisions pour ce couple enseignant/campagne.
        // Deux requêtes concurrentes ne peuvent donc pas valider le même quota
        // en parallèle : la deuxième attend la fin de la première transaction.
        const capacity = await manager.getRepository(TeacherCapacity).findOne({
          where: {
            teacherId: preliminary.teacherId,
            campaignId: preliminary.campaignId,
          },
          lock: { mode: 'pessimistic_write' },
        });
        if (!capacity) {
          throw new ConflictException('Aucune capacité définie pour cet enseignant et cette campagne.');
        }

        const application = await manager.getRepository(Application).findOne({
          where: { id: applicationId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!application) throw new NotFoundException('Candidature introuvable.');
        if (
          application.teacherId !== preliminary.teacherId ||
          application.campaignId !== preliminary.campaignId
        ) {
          throw new ConflictException('Candidature modifiée pendant la confirmation.');
        }
        if (application.status !== 'FAVORABLE') {
          throw new ConflictException('Seule une candidature favorable peut être affectée.');
        }

        const group = await manager.getRepository(PfaGroup).findOne({
          where: { id: application.groupId },
        });
        if (!group || group.campaignId !== application.campaignId) {
          throw new ConflictException('Groupe incompatible avec la campagne.');
        }

        const members = await manager.getRepository(GroupMember).find({
          where: { groupId: application.groupId },
        });
        if (!allMembersConfirmed(members)) {
          throw new ConflictException('Tous les membres doivent confirmer leur participation.');
        }
        const memberIds = members.map((m) => m.studentId).sort();

        // Verrouillage déterministe des étudiants. Il couvre aussi le cas où
        // deux enseignants différents tentent d'affecter le même étudiant.
        for (const studentId of memberIds) {
          const student = await manager.getRepository(Student).findOne({
            where: { id: studentId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!student) throw new ConflictException('Étudiant introuvable dans le groupe.');
        }

        // Contrôle de disponibilité : un sujet enseignant = au plus un PFA.
        // Les projets proposés par les étudiants peuvent avoir subjectId = null.
        if (application.subjectId) {
          const subject = await manager.getRepository(Subject).findOne({
            where: { id: application.subjectId },
          });
          if (
            !subject || !subject.isAvailable ||
            subject.teacherId !== application.teacherId ||
            subject.campaignId !== application.campaignId
          ) {
            throw new ConflictException('Le sujet demandé est indisponible ou incohérent.');
          }
          const assignedSubject = await manager.getRepository(Assignment).findOne({
            where: { subjectId: application.subjectId },
          });
          if (assignedSubject) throw new ConflictException('Ce sujet a déjà été attribué.');
        }

        const assignmentsCount = await manager.getRepository(Assignment).count({
          where: { teacherId: application.teacherId, campaignId: application.campaignId },
        });
        if (capacityReached(assignmentsCount, capacity.maxPfa)) {
          throw new ConflictException('Capacité d’encadrement atteinte.');
        }

        const alreadyAssignedMember = await manager.getRepository(AssignmentMember).findOne({
          where: {
            campaignId: application.campaignId,
            studentId: In(memberIds),
          },
        });
        if (alreadyAssignedMember) {
          throw new ConflictException('Au moins un étudiant est déjà affecté à un PFA.');
        }

        const assignmentId = randomUUID();
        await manager.getRepository(Assignment).insert({
          id: assignmentId,
          applicationId,
          campaignId: application.campaignId,
          teacherId: application.teacherId,
          groupId: application.groupId,
          subjectId: application.subjectId,
        });
        await manager.getRepository(AssignmentMember).insert(
          memberIds.map((studentId) => ({
            assignmentId,
            studentId,
            campaignId: application.campaignId,
          })),
        );
        await manager.getRepository(Application).update(applicationId, {
          status: 'AFFECTEE',
        });

        // Le commit de la transaction intervient après ce callback.
        return {
          assignmentId,
          applicationId,
          campaignId: application.campaignId,
          teacherId: application.teacherId,
          memberIds,
          status: 'AFFECTEE' as const,
        };
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;

      const driverError = (error as { driverError?: { code?: string } })?.driverError;
      const code = driverError?.code;
      if (code === '23505') {
        throw new ConflictException('Conflit d’unicité : étudiant, sujet ou candidature déjà affecté.');
      }
      if (code === '40P01' || code === '40001') {
        throw new ConflictException('Conflit transactionnel, veuillez réessayer.');
      }
      throw error;
    }
  }
}
