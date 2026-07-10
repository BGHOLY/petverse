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

  // 资质百分比。100 表示标准成长，不重复叠加稀有度和等级。
  @Column({ default: 100 })
  quality: number;

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

  // 外观基因。保留独立字段，方便 Cocos 直接读取和后续繁殖继承。
  @Column({ default: 'normal' })
  bodyType: string;

  @Column({ default: 'white' })
  color: string;

  @Column({ default: 'none' })
  pattern: string;

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
