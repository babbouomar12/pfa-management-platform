import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'students' })
export class Student {
  @PrimaryColumn({ type: 'uuid' }) id!: string;
  @Column({ type: 'text' }) name!: string;
}
