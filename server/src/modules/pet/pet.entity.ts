import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pets')
export class Pet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ownerId: number;

  @Column()
  nickname: string;

  @Column()
  species: string;

  @Column({ default: 1 })
  rarity: number;

  @Column({ default: '普通 Common' })
  rarityName: string;

  @Column({ default: 1 })
  level: number;

  @Column({ default: 0 })
  exp: number;

  @Column({ default: 100 })
  nextExp: number;

  @Column({ default: 100 })
  hp: number;

  @Column({ default: 20 })
  attack: number;

  @Column({ default: 20 })
  defense: number;

  @Column({ default: 20 })
  agility: number;

  @Column({ default: 20 })
  speed: number;

  @Column({ default: 20 })
  intelligence: number;

  @Column({ default: 100 })
  hunger: number;

  @Column({ default: 100 })
  happiness: number;

  @Column({ default: 100 })
  cleanliness: number;

  @Column({ default: 100 })
  stamina: number;

  @Column({ default: 'AAAA' })
  geneCode: string;

  @Column({ default: 12 })
  geneScore: number;

  @Column({ default: 0 })
  fatherId: number;

  @Column({ default: 0 })
  motherId: number;

  @Column({ default: false })
  married: boolean;

  @Column({ default: 0 })
  partnerId: number;

  @Column({ default: 0 })
  marriedPetId: number;

  @Column({ default: 2 })
  skillSlotCount: number;

  @Column({ type: 'simple-json', nullable: true })
  skills: any[];

  @Column({ default: false })
  isEgg: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  hatchTime: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastStatusUpdate: Date;

  @CreateDateColumn()
  createTime: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
