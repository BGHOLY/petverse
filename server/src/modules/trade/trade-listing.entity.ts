
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('trade_listings')
@Index(['status', 'createdAt'])
@Index(['sellerUserId', 'requestId'], { unique: true })
export class TradeListing {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sellerUserId: number;

  @Column()
  petId: number;

  @Column({ default: 'gold' })
  currencyType: string;

  @Column()
  price: number;

  @Column({ default: 100 })
  listingFeeGold: number;

  @Column({ type: 'float', default: 0.05 })
  taxRate: number;

  @Column({ default: 'active' })
  status: string;

  @Column({ default: 0 })
  buyerUserId: number;

  @Column({ length: 80 })
  requestId: string;

  @Column({ default: '' })
  buyRequestId: string;

  @Column({ type: 'simple-json', nullable: true })
  petSnapshot: Record<string, any>;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  soldAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
