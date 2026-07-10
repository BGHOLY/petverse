import UIEventCenter from '../manager/UIEventCenter';
import ApiClient from '../network/ApiClient';
import PlayerData from './PlayerData';

export default class GameStore {
    static async loadUser() {
        const result = await ApiClient.get('/user/profile');
        const user = result?.data || result?.user || result;
        if (result?.success === false || !user) return PlayerData.user;
        PlayerData.setUser(user);
        UIEventCenter.emit('USER_DATA_REFRESH_ONLY');
        return PlayerData.user;
    }

    static async loadPets() {
        const result = await ApiClient.get('/pet/my');
        const pets = this.listOf(result, ['pets', 'data']);
        if (result?.success === false) return PlayerData.pets;
        PlayerData.setPets(pets);
        UIEventCenter.emit('PETS_UPDATED');
        return pets;
    }

    static async loadInventory() {
        const result = await ApiClient.get('/inventory');
        const items = this.listOf(result, ['inventory', 'items', 'data']);
        if (result?.success === false) return PlayerData.inventory;
        PlayerData.inventory = items;
        UIEventCenter.emit('INVENTORY_UPDATED');
        return items;
    }

    static async loadShopItems() {
        const result = await ApiClient.get('/shop/items');
        const items = this.listOf(result, ['shopItems', 'items', 'data']);
        if (result?.success === false) return PlayerData.shopItems;
        PlayerData.shopItems = items;
        UIEventCenter.emit('SHOP_UPDATED');
        return items;
    }

    static async loadEggs() {
        const result = await ApiClient.get('/hatchery/eggs');
        const eggs = this.listOf(result, ['eggs', 'data']);
        if (result?.success === false) return PlayerData.eggs;
        PlayerData.eggs = eggs;
        UIEventCenter.emit('EGGS_UPDATED');
        return eggs;
    }

    static async loadMarriage() {
        const result = await ApiClient.get('/marriage');
        const marriage = this.listOf(result, ['marriages', 'data']);
        if (result?.success === false) return PlayerData.marriage;
        PlayerData.marriage = marriage;
        UIEventCenter.emit('MARRIAGE_UPDATED');
        return marriage;
    }

    static async loadFriends() {
        const result = await ApiClient.get('/friend');
        const friends = this.listOf(result, ['friends', 'data', 'list']);
        if (result?.success === false) return PlayerData.friends;
        PlayerData.friends = friends;
        UIEventCenter.emit('FRIENDS_UPDATED');
        return friends;
    }

    static async loadTower() {
        const result = await ApiClient.get('/tower/status');
        if (result?.success === false) return PlayerData.tower;
        PlayerData.tower = result;
        UIEventCenter.emit('TOWER_UPDATED');
        return result;
    }

    static async loadRanking() {
        const result = await ApiClient.get('/ranking');
        if (result?.success === false) return PlayerData.ranking;
        PlayerData.ranking = result;
        UIEventCenter.emit('RANKING_UPDATED');
        return result;
    }

    static async loadDailyTask() {
        const result = await ApiClient.get('/daily-task/me');
        if (result?.success === false) return PlayerData.dailyTask;
        PlayerData.dailyTask = result?.data || result?.task || result;
        UIEventCenter.emit('DAILY_TASK_UPDATED');
        return PlayerData.dailyTask;
    }

    static async bootstrapHome() {
        await Promise.all([
            this.loadUser(),
            this.loadPets(),
            this.loadTower(),
            this.loadDailyTask(),
        ]);
    }

    static async refreshAfterResourceChange() {
        await Promise.all([
            this.loadUser(),
            this.loadInventory(),
            this.loadPets(),
        ]);
    }

    private static listOf(result: any, keys: string[]) {
        if (Array.isArray(result)) return result;
        for (const key of keys) {
            if (Array.isArray(result?.[key])) return result[key];
        }
        return [];
    }
}
