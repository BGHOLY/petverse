import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EconomyModule } from '../economy/economy.module';
import { EggModule } from '../egg/egg.module';
import { Friend } from '../friend/friend.entity';
import { MailModule } from '../mail/mail.module';
import { Pet } from '../pet/pet.entity';
import { PetModule } from '../pet/pet.module';
import { User } from '../user/user.entity';
import { LineageService } from './lineage.service';
import { MarriageController } from './marriage.controller';
import { MarriageProposal } from './marriage-proposal.entity';
import { Marriage } from './marriage.entity';
import { MarriageService } from './marriage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Marriage,
      MarriageProposal,
      Pet,
      Friend,
      User,
    ]),
    EggModule,
    PetModule,
    EconomyModule,
    MailModule,
  ],
  controllers: [MarriageController],
  providers: [MarriageService, LineageService],
  exports: [MarriageService, LineageService],
})
export class MarriageModule {}
