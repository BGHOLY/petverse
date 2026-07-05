import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { Mail } from './mail.entity';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';

import { User } from '../user/user.entity';
import { Inventory } from '../inventory/inventory.entity';
import { Item } from '../item/item.entity';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Mail,
      User,
      Inventory,
      Item,
    ]),
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'petverse_dev_secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),
    InventoryModule,
  ],
  controllers: [MailController],
  providers: [MailService],
})
export class MailModule {}