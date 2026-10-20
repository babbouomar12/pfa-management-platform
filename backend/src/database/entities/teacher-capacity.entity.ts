import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'teacher_capacities' })
export class TeacherCapacity {
  @PrimaryColumn({ type: 'uuid', name: 'teacher_id' }) teacherId!: string;
  @PrimaryColumn({ type: 'uuid', name: 'campaign_id' }) campaignId!: string;
  @Column({ type: 'integer', name: 'max_pfa' }) maxPfa!: number;
}
