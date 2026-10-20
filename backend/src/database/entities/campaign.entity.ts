import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'campaigns' })
export class Campaign {
  @PrimaryColumn({ type: 'uuid' }) id!: string;
  @Column({ type: 'text' }) title!: string;
}
