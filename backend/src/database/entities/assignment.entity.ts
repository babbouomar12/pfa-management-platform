import { Column, CreateDateColumn, Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity({ name: 'assignments' })
@Unique('uq_assignment_application', ['applicationId'])
@Unique('uq_assignment_subject', ['subjectId'])
export class Assignment {
  @PrimaryColumn({ type: 'uuid' }) id!: string;
  @Column({ type: 'uuid', name: 'application_id' }) applicationId!: string;
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId!: string;
  @Column({ type: 'uuid', name: 'teacher_id' }) teacherId!: string;
  @Column({ type: 'uuid', name: 'group_id' }) groupId!: string;
  @Column({ type: 'uuid', name: 'subject_id', nullable: true }) subjectId!: string | null;
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' }) createdAt!: Date;
}
