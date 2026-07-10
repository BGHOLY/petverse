import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
import { ALL_SKILL_CONFIGS } from './config/skill.config';
import { SkillService } from './skill.service';

@Controller('skill')
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @Get()
  async getSkills() {
    return {
      success: true,
      skills: await this.skillService.getAllSkills(),
    };
  }

  @Get('config')
  getSkillConfig() {
    return {
      success: true,
      count: ALL_SKILL_CONFIGS.length,
      skills: ALL_SKILL_CONFIGS,
    };
  }

  @Post('seed')
  async seedSkills() {
    return this.skillService.seedDefaultSkills();
  }

  @Post('learn')
  async learnSkill(@Body() body: any) {
    return this.skillService.learnSkill(
      DEFAULT_USER_ID,
      Number(body?.petId || 0),
      String(body?.skillCode || ''),
      Array.isArray(body?.lockedSkillCodes) ? body.lockedSkillCodes : [],
      body?.seed ? String(body.seed) : undefined,
    );
  }

  @Get('logs/:petId')
  async getLearningLogs(@Param('petId') petId: string) {
    return {
      success: true,
      logs: await this.skillService.getPetLearningLogs(
        DEFAULT_USER_ID,
        Number(petId || 0),
      ),
    };
  }
}
