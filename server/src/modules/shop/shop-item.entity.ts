import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('shop_items')
@Index(['itemCode'], { unique: true })
export class ShopItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  itemCode: string;

  @Column()
  name: string;

  @Column({ default: 'gold' })
  currencyType: string;

  @Column()
  price: number;

  @Column({ default: 1 })
  quantity: number;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: '2.1.0' })
  version: string;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;
}
