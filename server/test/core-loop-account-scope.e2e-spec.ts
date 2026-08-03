import { INestApplication, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

import { BattleController } from '../src/modules/battle/battle.controller';
import { BattleService } from '../src/modules/battle/battle.service';
import { BattleTacticsService } from '../src/modules/battle/battle-tactics.service';
import { BattleV10Service } from '../src/modules/battle/battle-v10.service';
import { EconomyController } from '../src/modules/economy/economy.controller';
import { EconomyService } from '../src/modules/economy/economy.service';
import { ExplorationController } from '../src/modules/exploration/exploration.controller';
import { ExplorationService } from '../src/modules/exploration/exploration.service';
import { FormationController } from '../src/modules/formation/formation.controller';
import { FormationService } from '../src/modules/formation/formation.service';
import { FusionController } from '../src/modules/fusion/fusion.controller';
import { FusionService } from '../src/modules/fusion/fusion.service';
import { SkillController } from '../src/modules/skill/skill.controller';
import { SkillService } from '../src/modules/skill/skill.service';
import { TeamController } from '../src/modules/team/team.controller';
import { TeamService } from '../src/modules/team/team.service';
import { TowerController } from '../src/modules/tower/tower.controller';
import { TowerService } from '../src/modules/tower/tower.service';

const battleService = {};
const battleV10Service = {
  startPve: jest.fn(async (userId: number, body: any) => ({ success: true, userId, body })),
};
const tacticsService = {};
const economyService = {
  getWallet: jest.fn(async (userId: number) => ({ success: true, userId })),
};
const explorationService = {
  getWorld: jest.fn(async (userId: number) => ({ success: true, userId, regions: [] })),
};
const formationService = {
  getOverview: jest.fn(async (userId: number) => ({ success: true, userId, formations: [] })),
};
const fusionService = {
  preview: jest.fn(async (userId: number, parentAId: number, parentBId: number) => ({ success: true, userId, parentAId, parentBId })),
};
const skillService = {
  learnSkill: jest.fn(async (userId: number, petId: number, skillCode: string) => ({ success: true, userId, petId, skillCode })),
};
const teamService = {
  setTeam: jest.fn(async (userId: number, petIds: number[]) => ({ success: true, userId, petIds })),
};
const towerService = {
  getStatus: jest.fn(async (userId: number) => ({ success: true, userId, currentFloor: 1 })),
};

@Module({
  controllers: [
    BattleController,
    EconomyController,
    ExplorationController,
    FormationController,
    FusionController,
    SkillController,
    TeamController,
    TowerController,
  ],
  providers: [
    { provide: BattleService, useValue: battleService },
    { provide: BattleV10Service, useValue: battleV10Service },
    { provide: BattleTacticsService, useValue: tacticsService },
    { provide: EconomyService, useValue: economyService },
    { provide: ExplorationService, useValue: explorationService },
    { provide: FormationService, useValue: formationService },
    { provide: FusionService, useValue: fusionService },
    { provide: SkillService, useValue: skillService },
    { provide: TeamService, useValue: teamService },
    { provide: TowerService, useValue: towerService },
  ],
})
class CoreLoopAccountScopeModule {}

describe('core gameplay account scope (e2e)', () => {
  let app: INestApplication;
  const userId = 77;

  beforeAll(async () => {
    app = await NestFactory.create(CoreLoopAccountScopeModule, { logger: false });
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps cultivation, formation and battle requests on the selected account', async () => {
    await request(app.getHttpServer())
      .post('/api/fusion/preview')
      .set('X-User-Id', String(userId))
      .send({ parentAId: 11, parentBId: 12 })
      .expect(201);
    expect(fusionService.preview).toHaveBeenCalledWith(userId, 11, 12, undefined, false, []);

    await request(app.getHttpServer())
      .post('/api/team/set')
      .set('X-User-Id', String(userId))
      .send({ petIds: [11, 12, 13, 14, 15], formationCode: 'dragon' })
      .expect(201);
    expect(teamService.setTeam).toHaveBeenCalledWith(
      userId,
      [11, 12, 13, 14, 15],
      'dragon',
      undefined,
      undefined,
    );

    const battlePayload = { mode: 'pve', formationCode: 'dragon' };
    await request(app.getHttpServer())
      .post('/api/battle/v10/start')
      .set('X-User-Id', String(userId))
      .send(battlePayload)
      .expect(201);
    expect(battleV10Service.startPve).toHaveBeenCalledWith(userId, battlePayload);
  });

  it('keeps progression reads and skill learning on the selected account', async () => {
    await request(app.getHttpServer()).get('/api/economy/wallet').set('X-User-Id', String(userId)).expect(200);
    await request(app.getHttpServer()).get('/api/exploration/world').set('X-User-Id', String(userId)).expect(200);
    await request(app.getHttpServer()).get('/api/formation').set('X-User-Id', String(userId)).expect(200);
    await request(app.getHttpServer()).get('/api/tower/status').set('X-User-Id', String(userId)).expect(200);
    await request(app.getHttpServer())
      .post('/api/skill/learn')
      .set('X-User-Id', String(userId))
      .send({ petId: 11, skillCode: 'high_combo', requestId: 'scope-test' })
      .expect(201);

    expect(economyService.getWallet).toHaveBeenCalledWith(userId);
    expect(explorationService.getWorld).toHaveBeenCalledWith(userId);
    expect(formationService.getOverview).toHaveBeenCalledWith(userId);
    expect(towerService.getStatus).toHaveBeenCalledWith(userId);
    expect(skillService.learnSkill).toHaveBeenCalledWith(userId, 11, 'high_combo', [], undefined, 'scope-test');
  });
});
