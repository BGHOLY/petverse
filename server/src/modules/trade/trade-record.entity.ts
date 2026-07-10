
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('trade_records')
@Index(['buyerUserId', 'requestId'], { unique: true })
export class TradeRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  listingId: number;

  @Column()
  petId: number;

  @Column()
  sellerUserId: number;

  @Column()
  buyerUserId: number;

  @Column({ default: 'gold' })
  currencyType: string;

  @Column()
  price: number;

  @Column({ default: 0 })
  taxAmount: number;

  @Column({ default: 0 })
  sellerIncome: number;

  @Column({ length: 80 })
  requestId: string;

  @Column({ type: 'simple-json', nullable: true })
  petSnapshot: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
