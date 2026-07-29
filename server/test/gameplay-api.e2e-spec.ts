import { INestApplication, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

import { BattleController } from '../src/modules/battle/battle.controller';
import { BattleService } from '../src/modules/battle/battle.service';
import { BattleTacticsService } from '../src/modules/battle/battle-tactics.service';
import { BattleV10Service } from '../src/modules/battle/battle-v10.service';
import { ExpeditionController } from '../src/modules/expedition/expedition.controller';
import { ExpeditionService } from '../src/modules/expedition/expedition.service';

const tacticsService = {
  getOptions: jest.fn(() => ({
    success: true,
    targetStrategies: ['LOWEST_HP'],
    skillStrategies: ['CAST_IMMEDIATELY'],
    survivalStrategies: ['PROTECT_BACKLINE'],
  })),
  getPreset: jest.fn(async (userId: number) => ({
    success: true,
    userId,
    preset: {
      targetStrategy: 'LOWEST_HP',
      skillStrategy: 'CAST_IMMEDIATELY',
      survivalStrategy: 'PROTECT_BACKLINE',
    },
  })),
  savePreset: jest.fn(async (userId: number, body: any) => ({
    success: true,
    userId,
    preset: body.preset,
  })),
};

const expeditionService = {
  getConfig: jest.fn(() => ({
    success: true,
    durations: [30, 120, 240, 480],
    maps: [{ code: 'forest', name: '森林' }],
  })),
  start: jest.fn(async (
    userId: number,
    mapCode: string,
    durationMinutes: number,
    petIds: number[],
    requestId: string,
  ) => ({
    success: true,
    expedition: { id: 9, userId, mapCode, durationMinutes, petIds, requestId },
  })),
  getActive: jest.fn(async (userId: number) => ({
    success: true,
    userId,
    expeditions: [],
  })),
  claim: jest.fn(async (userId: number, expeditionId: number) => ({
    success: true,
    userId,
    expeditionId,
  })),
  getHistory: jest.fn(async () => ({ success: true, expeditions: [] })),
  devComplete: jest.fn(async () => ({ success: true })),
};

@Module({
  controllers: [BattleController, ExpeditionController],
  providers: [
    { provide: BattleService, useValue: {} },
    { provide: BattleV10Service, useValue: {} },
    { provide: BattleTacticsService, useValue: tacticsService },
    { provide: ExpeditionService, useValue: expeditionService },
  ],
})
class GameplayApiTestModule {}

describe('gameplay API contracts (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await NestFactory.create(GameplayApiTestModule, { logger: false });
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reads and saves the current user battle tactics through HTTP', async () => {
    const options = await request(app.getHttpServer())
      .get('/api/battle/tactics/options')
      .expect(200);
    expect(options.body.success).toBe(true);

    const preset = {
      targetStrategy: 'HEALER_FIRST',
      skillStrategy: 'CONTROL_COMBO',
      survivalStrategy: 'HEAL_LOW_HP',
    };
    const saved = await request(app.getHttpServer())
      .put('/api/battle/tactics/preset')
      .set('X-User-Id', '77')
      .send({ preset })
      .expect(200);

    expect(saved.body).toMatchObject({ success: true, userId: 77, preset });
    expect(tacticsService.savePreset).toHaveBeenCalledWith(77, { preset });
  });

  it('starts an expedition for the request user through HTTP', async () => {
    const payload = {
      mapCode: 'volcano',
      durationMinutes: 120,
      petIds: [1, 2, 3, 4, 5],
      requestId: 'e2e-expedition-request',
    };
    const response = await request(app.getHttpServer())
      .post('/api/expedition/start')
      .set('X-User-Id', '88')
      .send(payload)
      .expect(201);

    expect(response.body.expedition).toMatchObject({
      userId: 88,
      ...payload,
    });
    expect(expeditionService.start).toHaveBeenCalledWith(
      88,
      payload.mapCode,
      payload.durationMinutes,
      payload.petIds,
      payload.requestId,
    );
  });
});
