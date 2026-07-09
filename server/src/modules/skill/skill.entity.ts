import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  skillCode: string;

  @Column()
  name: string;

  @Column({ default: '' })
  description: string;

  @Column({ default: 1 })
  rarity: number;

  @Column({ default: 'attack' })
  type: string;

  @Column({ default: 0 })
  power: number;

  @Column({ type: 'float', default: 0 })
  triggerRate: number;

  @Column({ default: '' })
  effect: string;

  @CreateDateColumn()
  createdAt: Date;
}
