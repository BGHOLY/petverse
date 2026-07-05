import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('shop_items')
export class ShopItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  itemCode: string;

  @Column()
  name: string;

  @Column({
    default: 'gold',
  })
  currencyType: string;

  @Column()
  price: number;

  @Column({
    default: 1,
  })
  quantity: number;

  @Column({
    default: true,
  })
  enabled: boolean;

  @CreateDateColumn()
  createTime: Date;
}