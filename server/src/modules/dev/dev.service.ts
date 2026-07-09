import { Injectable } from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
import { FriendService } from '../friend/friend.service';
import { InventoryService } from '../inventory/inventory.service';
import { ItemService } from '../item/item.service';
import { PetService } from '../pet/pet.service';
import { ShopService } from '../shop/shop.service';
import { SkillService } from '../skill/skill.service';
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
  ) {}

  async seedAll() {
    const user = await this.userService.getOrCreateDefaultUser();
    const skills = await this.skillService.seedDefaultSkills();
    const items = await this.itemService.seedDefaultItems();
    const shop = await this.shopService.seedShopItems();
    const pet = await this.petService.seedDefaultPet(user.id || DEFAULT_USER_ID);
    const friends = await this.friendService.seedMockFriends(user.id || DEFAULT_USER_ID);

    await this.inventoryService.ensureItemQuantity(user.id, 'apple', 3);
    await this.inventoryService.ensureItemQuantity(user.id, 'dried_fish', 2);
    await this.inventoryService.ensureItemQuantity(user.id, 'clean_spray', 2);
    await this.inventoryService.ensureItemQuantity(user.id, 'exp_potion_small', 3);
    await this.inventoryService.ensureItemQuantity(user.id, 'common_pet_egg', 1);
    await this.towerService.getMyRecord(user.id);

    const inventory = await this.inventoryService.getUserInventory(user.id);
    const pets = await this.petService.getUserPets(user.id);
    const tower = await this.towerService.getStatus(user.id);

    return {
      success: true,
      message: 'PetVerse beta data seeded',
      user,
      skills: skills.skills,
      items: items.items,
      shopItems: shop.shopItems,
      defaultPet: pet,
      pets: pets.pets,
      inventory,
      friends: friends.friends,
      tower,
    };
  }
}
