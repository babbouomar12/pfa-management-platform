import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'pfa_groups' })
export class PfaGroup {
  @PrimaryColumn({ type: 'uuid' }) id!: string;
  @Column({ type: 'uuid', name: 'campaign_id' }) campaignId!: string;
  @Column({ type: 'text' }) name!: string;
}
