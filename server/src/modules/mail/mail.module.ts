
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EconomyModule } from '../economy/economy.module';
import { MailController } from './mail.controller';
import { Mail } from './mail.entity';
import { MailService } from './mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Mail]),
    EconomyModule,
  ],
  controllers: [MailController],
  providers: [MailService],
  exports: [TypeOrmModule, MailService],
})
export class MailModule {}
