import { Global, Module } from '@nestjs/common';

import { ServerTimeController } from './server-time.controller';
import { ServerTimeService } from './server-time.service';

@Global()
@Module({
  controllers: [ServerTimeController],
  providers: [ServerTimeService],
  exports: [ServerTimeService],
})
export class ServerTimeModule {}
