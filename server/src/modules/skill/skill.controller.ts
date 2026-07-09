import { Controller, Get, Post } from '@nestjs/common';

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

  @Post('seed')
  async seedSkills() {
    return this.skillService.seedDefaultSkills();
  }
}
