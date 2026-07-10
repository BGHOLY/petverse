import { Injectable } from '@nestjs/common';

import { AchievementService } from '../achievement/achievement.service';
import { EconomyService } from '../economy/economy.service';
import { DEFAULT_USER_ID } from '../game-data';
import { FriendService } from '../friend/friend.service';
import { InventoryService } from '../inventory/inventory.service';
import { ItemService } from '../item/item.service';
import { MailService } from '../mail/mail.service';
import { PetCapacityService } from '../pet-capacity/pet-capacity.service';
import { PetService } from '../pet/pet.service';
import { ShopService } from '../shop/shop.service';
import { SeasonService } from '../season/season.service';
import { SkillService } from '../skill/skill.service';
import { TeamService } from '../team/team.service';
import { TowerService } from '../tower/tower.service';
import { UserService } from '../user/user.service';

@Injectable()
export class DevService {
  constructor(
    private readonly userService: UserService,
    private readonly itemService: ItemService,
    private readonly shopService: ShopService,
    private readonly skillService: SkillService,
    private readonly petService: PetService,
    private readonly friendService: FriendService,
    private readonly inventoryService: InventoryService,
    private readonly towerService: TowerService,
    private readonly economyService: EconomyService,
    private readonly teamService: TeamService,
    private readonly achievementService: AchievementService,
    private readonly mailService: MailService,
    private readonly seasonService: SeasonService,
    private readonly petCapacityService: PetCapacityService,
  ) {}

  async seedAll() {
    const user =
      await this.userService.getOrCreateDefaultUser();
    const userId = user.id || DEFAULT_USER_ID;

    const skills =
      await this.skillService.seedDefaultSkills();
    const items =
      await this.itemService.seedDefaultItems();
    const shop =
      await this.shopService.seedShopItems();
    const pet =
      await this.petService.seedDefaultPet(userId);
    const speciesRepair =
      await this.petService.repairLegacySpeciesForUser(userId);
    const friends =
      await this.friendService.seedMockFriends(userId);

    await this.economyService.ensureMinimumBalance(
      userId,
      100000,
      1000,
    );

    const starterItems: Record<string, number> = {
      apple: 10,
      dried_fish: 10,
      clean_spray: 10,
      exp_potion_small: 20,
      exp_potion_medium: 10,
      exp_potion_large: 5,
      common_pet_egg: 3,
      rare_pet_egg: 1,
      breeding_token: 20,
      fusion_core: 20,
      skill_lock: 100,
      mutation_essence: 5,
      pet_capacity_ticket: 3,
      season_token: 5,
      BOOK_LOW_PHYSICAL_COMBO: 3,
      BOOK_LOW_PHYSICAL_CRIT: 3,
      BOOK_LOW_MAGIC_COMBO: 3,
      BOOK_LOW_MAGIC_CRIT: 3,
      BOOK_LOW_MAX_HP: 3,
      BOOK_LOW_HEALING_POWER: 3,
      BOOK_HIGH_PHYSICAL_COMBO: 1,
      BOOK_HIGH_MAGIC_COMBO: 1,
    };

    for (const [itemCode, quantity] of Object.entries(
      starterItems,
    )) {
      await this.inventoryService.ensureItemQuantity(
        userId,
        itemCode,
        quantity,
      );
    }

    await this.towerService.getMyRecord(userId);
    const team = await this.teamService.getTeam(userId);
    if (!team.petIds?.length && pet?.id) {
      await this.teamService.setTeam(userId, [pet.id]);
    }

    const inventory =
      await this.inventoryService.getUserInventory(userId);
    const pets =
      await this.petService.getUserPets(userId);
    const tower =
      await this.towerService.getStatus(userId);
    const wallet =
      await this.economyService.getWallet(userId);
    const finalTeam =
      await this.teamService.getTeam(userId);
    const achievements =
      await this.achievementService.seedAchievements(userId);
    const welcomeMail =
      await this.mailService.seedWelcomeMail(userId);
    const season =
      await this.seasonService.getMySeason(userId);
    const petCapacity =
      await this.petCapacityService.getStatus(userId);

    return {
      success: true,
      message: 'PetVerse backend V2.3 final data seeded',
      version: '2.3.0',
      user: {
        ...user,
        gold: wallet.gold,
        diamond: wallet.diamond,
      },
      skills: skills.skills,
      items: items.items,
      shopItems: shop.shopItems,
      defaultPet: pet,
      speciesRepair,
      pets: pets.pets,
      inventory,
      friends: friends.friends,
      tower,
      wallet,
      team: finalTeam,
      achievements,
      welcomeMail,
      season,
      petCapacity,
    };
  }
}
