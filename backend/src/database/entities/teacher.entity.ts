import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'teachers' })
export class Teacher {
  @PrimaryColumn({ type: 'uuid' }) id!: string;
  @Column({ type: 'text' }) name!: string;
}
