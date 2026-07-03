import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PetModule } from './modules/pet/pet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PetModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}