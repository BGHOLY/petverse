import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('battles')
export class Battle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  attackerUserId: number;

  @Column()
  attackerPetId: number;

  @Column()
  defenderUserId: number;

  @Column()
  defenderPetId: number;

  @Column({ default: 0 })
  winnerPetId: number;

  @Column({ default: false })
  finished: boolean;

  @Column({ default: '' })
  battleLog: string;

  @CreateDateColumn()
  createTime: Date;
}