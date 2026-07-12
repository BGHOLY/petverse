import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EconomyModule } from '../economy/economy.module';
import { FormationController } from './formation.controller';
import { FormationService } from './formation.service';
import { FormationUpgradeLog } from './formation-upgrade-log.entity';
import { FormationWallet } from './formation-wallet.entity';
import { UserFormation } from './user-formation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserFormation, FormationWallet, FormationUpgradeLog]),
    EconomyModule,
  ],
  controllers: [FormationController],
  providers: [FormationService],
  exports: [FormationService, TypeOrmModule],
})
export class FormationModule {}
