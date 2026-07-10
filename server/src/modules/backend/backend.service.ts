
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GameOperationRecord } from '../economy/game-operation-record.entity';
import { FriendRequest } from '../friend/friend-request.entity';
import { Friend } from '../friend/friend.entity';
import { FusionRecord } from '../fusion/fusion-record.entity';
import { ALL_ITEM_CONFIGS } from '../item/config/item.config';
import { Item } from '../item/item.entity';
import { Mail } from '../mail/mail.entity';
import { PET_SPECIES_CONFIGS } from '../pet/config/pet-species.config';
import { Pet } from '../pet/pet.entity';
import { RankingSnapshot } from '../ranking/ranking-snapshot.entity';
import { SeasonPlayer } from '../season/season-player.entity';
import { Season } from '../season/season.entity';
import { ALL_SKILL_CONFIGS } from '../skill/config/skill.config';
import { Skill } from '../skill/skill.entity';
import { PetTeam } from '../team/pet-team.entity';
import { TradeListing } from '../trade/trade-listing.entity';
import { TradeRecord } from '../trade/trade-record.entity';

@Injectable()
export class BackendService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,

    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,

    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    @InjectRepository(FusionRecord)
    private readonly fusionRecordRepository: Repository<FusionRecord>,

    @InjectRepository(GameOperationRecord)
    private readonly operationRepository: Repository<GameOperationRecord>,

    @InjectRepository(PetTeam)
    private readonly teamRepository: Repository<PetTeam>,

    @InjectRepository(Friend)
    private readonly friendRepository: Repository<Friend>,

    @InjectRepository(FriendRequest)
    private readonly friendRequestRepository: Repository<FriendRequest>,

    @InjectRepository(Mail)
    private readonly mailRepository: Repository<Mail>,

    @InjectRepository(Season)
    private readonly seasonRepository: Repository<Season>,

    @InjectRepository(SeasonPlayer)
    private readonly seasonPlayerRepository: Repository<SeasonPlayer>,

    @InjectRepository(RankingSnapshot)
    private readonly snapshotRepository: Repository<RankingSnapshot>,

    @InjectRepository(TradeListing)
    private readonly listingRepository: Repository<TradeListing>,

    @InjectRepository(TradeRecord)
    private readonly tradeRecordRepository: Repository<TradeRecord>,
  ) {}

  async status() {
    const [
      enabledSkills,
      enabledItems,
      pets,
      fusions,
      operations,
      teams,
      friends,
      friendRequests,
      mails,
      seasons,
      seasonPlayers,
      rankingSnapshots,
      activeListings,
      tradeRecords,
    ] = await Promise.all([
      this.skillRepository.count({
        where: { enabled: true },
      }),
      this.itemRepository.count({
        where: { enabled: true },
      }),
      this.petRepository.count(),
      this.fusionRecordRepository.count(),
      this.operationRepository.count(),
      this.teamRepository.count(),
      this.friendRepository.count(),
      this.friendRequestRepository.count(),
      this.mailRepository.count(),
      this.seasonRepository.count(),
      this.seasonPlayerRepository.count(),
      this.snapshotRepository.count(),
      this.listingRepository.count({
        where: { status: 'active' },
      }),
      this.tradeRecordRepository.count(),
    ]);

    const checks = {
      speciesConfig:
        PET_SPECIES_CONFIGS.length === 10,
      skillConfig:
        ALL_SKILL_CONFIGS.length === 70,
      itemConfig:
        ALL_ITEM_CONFIGS.length >= 74,
      skillDatabase:
        enabledSkills ===
        ALL_SKILL_CONFIGS.length,
      itemDatabase:
        enabledItems ===
        ALL_ITEM_CONFIGS.length,
      v22TablesReady:
        [
          friends,
          friendRequests,
          mails,
          seasons,
          seasonPlayers,
          rankingSnapshots,
          activeListings,
          tradeRecords,
        ].every(
          (value) =>
            Number.isInteger(value) &&
            value >= 0,
        ),
    };

    return {
      success: Object.values(checks).every(Boolean),
      version: '2.2.0',
      checks,
      config: {
        species: PET_SPECIES_CONFIGS.length,
        skills: ALL_SKILL_CONFIGS.length,
        items: ALL_ITEM_CONFIGS.length,
      },
      database: {
        enabledSkills,
        enabledItems,
        pets,
        fusions,
        operations,
        teams,
        friends,
        friendRequests,
        mails,
        seasons,
        seasonPlayers,
        rankingSnapshots,
        activeListings,
        tradeRecords,
      },
      features: {
        realFriends: true,
        multiAttachmentMail: true,
        seasons: true,
        rankingSettlement: true,
        petTrading: true,
        petCapacity: true,
      },
      nextAction: Object.values(checks).every(Boolean)
        ? 'Backend V2.2 systems are ready'
        : 'Run POST /api/dev/seed-all',
    };
  }

  verifyConfig() {
    const skillCodes =
      ALL_SKILL_CONFIGS.map(
        (skill) => skill.skillCode,
      );
    const itemCodes =
      ALL_ITEM_CONFIGS.map(
        (item) => item.itemCode,
      );
    const duplicateSkills =
      skillCodes.filter(
        (code, index) =>
          skillCodes.indexOf(code) !== index,
      );
    const duplicateItems =
      itemCodes.filter(
        (code, index) =>
          itemCodes.indexOf(code) !== index,
      );
    const invalidSkills =
      ALL_SKILL_CONFIGS.filter(
        (skill) =>
          !skill.skillCode ||
          !skill.familyCode ||
          !skill.effect ||
          skill.triggerRate < 0 ||
          skill.triggerRate > 1,
      );
    const invalidItems =
      ALL_ITEM_CONFIGS.filter(
        (item) =>
          !item.itemCode ||
          !item.name ||
          item.maxStack < 1,
      );
    const requiredItems = [
      'pet_capacity_ticket',
      'season_token',
      'breeding_token',
      'fusion_core',
      'skill_lock',
    ];
    const missingRequiredItems =
      requiredItems.filter(
        (itemCode) =>
          !itemCodes.includes(itemCode),
      );

    return {
      success:
        !duplicateSkills.length &&
        !duplicateItems.length &&
        !invalidSkills.length &&
        !invalidItems.length &&
        !missingRequiredItems.length &&
        PET_SPECIES_CONFIGS.length === 10 &&
        ALL_SKILL_CONFIGS.length === 70 &&
        ALL_ITEM_CONFIGS.length >= 74,
      version: '2.2.0',
      duplicateSkills,
      duplicateItems,
      invalidSkillCodes:
        invalidSkills.map(
          (skill) => skill.skillCode,
        ),
      invalidItemCodes:
        invalidItems.map(
          (item) => item.itemCode,
        ),
      missingRequiredItems,
      counts: {
        species: PET_SPECIES_CONFIGS.length,
        skills: ALL_SKILL_CONFIGS.length,
        items: ALL_ITEM_CONFIGS.length,
      },
    };
  }
}
