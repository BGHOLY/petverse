import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EconomyModule } from '../economy/economy.module';
import { FormationModule } from '../formation/formation.module';
import { InventoryModule } from '../inventory/inventory.module';
import { Pet } from '../pet/pet.entity';
import { TeamModule } from '../team/team.module';
import { GuildBossRecord } from './guild-boss-record.entity';
import { GuildController } from './guild.controller';
import { GuildDonation } from './guild-donation.entity';
import { GuildExpedition } from './guild-expedition.entity';
import { GuildHelpRequest } from './guild-help.entity';
import { GuildMember } from './guild-member.entity';
import { GuildService } from './guild.service';
import { GuildTask } from './guild-task.entity';
import { Guild } from './guild.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Guild, GuildMember, GuildTask, GuildBossRecord, GuildDonation, GuildExpedition, GuildHelpRequest, Pet]),
    EconomyModule,
    InventoryModule,
    FormationModule,
    TeamModule,
  ],
  controllers: [GuildController],
  providers: [GuildService],
  exports: [GuildService, TypeOrmModule],
})
export class GuildModule {}
