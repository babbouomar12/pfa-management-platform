import { Column, Entity, PrimaryColumn } from 'typeorm';

export type ApplicationStatus =
  | 'EN_ATTENTE'
  | 'PRESELECTIONNEE'
  | 'FAVORABLE'
  | 'REFUSEE'
  | 'AFFECTEE';

@Entity({ name: 'applications' })
export class Application {
  @PrimaryColumn({ type: 'uuid' }) id!: string;
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId!: string;
  @Column({ type: 'uuid', name: 'teacher_id' }) teacherId!: string;
  @Column({ type: 'uuid', name: 'group_id' }) groupId!: string;
  @Column({ type: 'uuid', name: 'subject_id', nullable: true }) subjectId!: string | null;
  @Column({ type: 'text', name: 'project_title' }) projectTitle!: string;
  @Column({ type: 'text' }) status!: ApplicationStatus;
}
