import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';

import { resolveRequestUserId } from '../../common/request-user.util';
import { ALL_SKILL_CONFIGS } from './config/skill.config';
import { SkillService } from './skill.service';
import { getSkillCombatTags } from '../battle/combat-reaction.config';

@Controller('skill')
export class SkillController {
  constructor(
    private readonly skillService: SkillService,
  ) {}

  @Get()
  async getSkills() {
    return {
      success: true,
      skills:
        await this.skillService.getAllSkills(),
    };
  }

  @Get('config')
  getSkillConfig() {
    return {
      success: true,
      count: ALL_SKILL_CONFIGS.length,
      skills: ALL_SKILL_CONFIGS.map((skill) => ({
        ...skill,
        combatTags: getSkillCombatTags(skill),
      })),
    };
  }

  @Post('seed')
  seedSkills() {
    return this.skillService.seedDefaultSkills();
  }

  @Post('learn')
  learnSkill(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.skillService.learnSkill(
      resolveRequestUserId(userId),
      Number(body?.petId || 0),
      String(body?.skillCode || ''),
      Array.isArray(body?.lockedSkillCodes)
        ? body.lockedSkillCodes
        : [],
      body?.seed
        ? String(body.seed)
        : undefined,
      body?.requestId
        ? String(body.requestId)
        : undefined,
    );
  }

  @Get('logs/:petId')
  async getLearningLogs(
    @Headers('x-user-id') userId: string,
    @Param('petId') petId: string,
  ) {
    return {
      success: true,
      logs:
        await this.skillService.getPetLearningLogs(
          resolveRequestUserId(userId),
          Number(petId || 0),
        ),
    };
  }
}
