import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'group_members' })
export class GroupMember {
  @PrimaryColumn({ type: 'uuid', name: 'group_id' }) groupId!: string;
  @PrimaryColumn({ type: 'uuid', name: 'student_id' }) studentId!: string;
  @Column({ type: 'timestamptz', name: 'confirmed_at', nullable: true }) confirmedAt!: Date | null;
}
