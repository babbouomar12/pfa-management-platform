import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'subjects' })
export class Subject {
  @PrimaryColumn({ type: 'uuid' }) id!: string;
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId!: string;
  @Column({ type: 'uuid', name: 'teacher_id' }) teacherId!: string;
  @Column({ type: 'text' }) title!: string;
  @Column({ type: 'boolean', name: 'is_available' }) isAvailable!: boolean;
}
