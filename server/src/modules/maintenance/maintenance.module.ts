import { Module } from '@nestjs/common';

import { MarriageModule } from '../marriage/marriage.module';
import { TradeModule } from '../trade/trade.module';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';

@Module({
  imports: [MarriageModule, TradeModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
