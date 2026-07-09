import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('marriages')
export class Marriage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  petAId: number;

  @Column()
  petBId: number;

  @Column()
  ownerAId: number;

  @Column()
  ownerBId: number;

  @Column({ default: 'active' })
  status: string;

  @Column({ default: 0 })
  eggCount: number;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  cooldownEndAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
