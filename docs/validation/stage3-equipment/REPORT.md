# PetVerse 装备系统 MVP 验收报告

## 范围

本阶段完成最小装备闭环：冒险掉落、背包查看、宠物穿戴、替换、卸下、属性与战力刷新，以及战斗读取装备后的真实属性。未包含强化、洗练、升星、宝石、套装、分解和交易。

开放槽位：头部、项链、护符、饰品。徽记与灵石继续锁定，并显示解锁条件。

## 数据与接口

- 新增数据库表：`equipment_items`
- 核心字段：`ownerId`、`itemTemplateId`、`slotType`、`rarity`、`level`、`mainStat`、`subStats`、`equippedPetId`、`locked`、`sourceBattleId`、`sourceKey`
- `sourceKey` 唯一，战斗掉落使用 `battle:<battleId>:equipment:0`，避免同一场战斗重复生成装备。
- `GET /api/equipment`：当前账号装备列表
- `GET /api/equipment/pet/:petId`：指定宠物装备与属性加成
- `POST /api/equipment/equip`：穿戴或替换
- `POST /api/equipment/unequip`：卸下
- `POST /api/equipment/dev/seed`：幂等开发测试数据

## 实际验证

- Cocos Creator 3.8.8、设计分辨率 720×1280。
- 用户 201：晨曦猫穿戴林语头巾与月露项链后，生命为 495、防御为 64、装备战力为 44；卸下头部装备后总战力从 1510 降至 1477，重新穿戴后恢复为 1510。
- 同一装备尝试穿戴给另一只宠物时，后端拒绝。
- 宠物页显示四个开放槽位及两个锁定槽位；空槽、已装备和锁定状态可区分。
- 普通战斗掉落 2 星装备，首领战掉落 4 星装备。
- 战斗闭环测试生成的普通掉落带唯一 `sourceBattleId` 与 `sourceKey`；重复结算返回 `duplicate: true`，未重复发放。
- 五种阵法战斗、真实失败、首领战、奖励与探索进度回归通过。
- 后端 `npm run build` 通过。
- Cocos 预览控制台只有引擎初始化日志，无 warning/error。

## 截图

- `01-home-navigation-fixed.png`：家园图标尺寸与绿色框修复
- `02-pet-equipment-slots.png`：宠物装备槽
- `03-equipment-picker.png`：装备选择器
- `04-equipment-unequipped.png`：卸下头部装备后状态
- `05-equipment-reequipped.png`：重新穿戴后状态
- `06-equipment-page-final.png`：最终宠物装备页

## 数据库兼容

项目当前使用 TypeORM 自动同步创建 `equipment_items`。没有重置或清空现有数据库，也没有修改 `.env`。正式部署前应将该表结构固化为迁移文件，并在生产环境关闭自动同步。
