import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
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

  @Column({ default: 1 })
  level: number;

  @Column({ default: 0 })
  exp: number;

  @Column({ default: 100 })
  hp: number;

  @Column({ default: 20 })
  attack: number;

  @Column({ default: 20 })
  defense: number;

  @Column({ default: 20 })
  agility: number;

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

  @Column({ default: 0 })
  fatherId: number;

  @Column({ default: 0 })
  motherId: number;

  @Column({ default: false })
  married: boolean;

  @Column({ default: 0 })
  partnerId: number;

  @CreateDateColumn()
  createTime: Date;

  @Column({
  type: 'timestamp',
  default: () => 'CURRENT_TIMESTAMP',
})
lastStatusUpdate: Date;
}