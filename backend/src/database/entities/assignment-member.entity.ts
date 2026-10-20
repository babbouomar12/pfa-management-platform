import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity({ name: 'assignment_members' })
@Unique('uq_student_campaign_assignment', ['campaignId', 'studentId'])
export class AssignmentMember {
  @PrimaryColumn({ type: 'uuid', name: 'assignment_id' }) assignmentId!: string;
  @PrimaryColumn({ type: 'uuid', name: 'student_id' }) studentId!: string;
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId!: string;
}
