import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('equipment_items')
@Index(['ownerId', 'equippedPetId'])
export class EquipmentItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ownerId: number;

  @Column({ length: 64 })
  itemTemplateId: string;

  @Column({ length: 80 })
  name: string;

  @Column({ length: 24 })
  slotType: string;

  @Column({ default: 1 })
  rarity: number;

  @Column({ default: 1 })
  level: number;

  @Column({ type: 'simple-json', nullable: true })
  mainStat: Record<string, number>;

  @Column({ type: 'simple-json', nullable: true })
  subStats: Record<string, number>;

  @Column({ default: 0 })
  equippedPetId: number;

  @Column({ default: false })
  locked: boolean;

  @Column({ default: '' })
  sourceBattleId: string;

  @Column({ nullable: true, unique: true })
  sourceKey: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
