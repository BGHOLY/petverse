import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  assertProductionRuntime,
  configuredCorsOrigins,
} from './config/runtime.config';

async function bootstrap() {
  assertProductionRuntime();
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT || 3000);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: configuredCorsOrigins(),
    credentials: true,
  });

  await app.listen(port);

  console.log('======================================');
  console.log(' PetVerse Server Started Successfully ');
  console.log(` http://localhost:${port}/api`);
  console.log('======================================');
}

bootstrap();
