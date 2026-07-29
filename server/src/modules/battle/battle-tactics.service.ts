import { Injectable } from '@nestjs/common';

import { TeamService } from '../team/team.service';
import {
  BATTLE_TACTICS_OPTIONS,
  normalizeBattleTactics,
} from './battle-tactics.config';

@Injectable()
export class BattleTacticsService {
  constructor(private readonly teamService: TeamService) {}

  getOptions() {
    return {
      success: true,
      version: '1.0.0',
      ...BATTLE_TACTICS_OPTIONS,
    };
  }

  async getPreset(userId: number) {
    const team = await this.teamService.getTeam(userId);
    return {
      success: true,
      preset: normalizeBattleTactics(team.tactics),
    };
  }

  async savePreset(userId: number, raw: any) {
    const preset = normalizeBattleTactics(raw?.preset || raw);
    const result = await this.teamService.setTactics(userId, preset);
    return {
      ...result,
      preset,
    };
  }
}
