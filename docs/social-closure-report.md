# 好友、婚礼、生蛋与双账号社交闭环

## 验收结论

本阶段在 `ui-redesign-v2` 上补全了两个真实用户之间的好友、婚礼、双蛋与独立孵化闭环。商店、背包、宠物、孵化室、编队、冒险和战斗布局均未重做，设计分辨率保持 `720 × 1280`。

完整链路已经实际跑通：

```text
账号A搜索账号B → 发送好友申请 → B拒绝
→ A再次申请 → B接受 → 双方好友列表一致
→ A选择自己的宠物和B的宠物 → B拒绝
→ A再次申请 → B接受
→ 两只宠物写入同一婚姻 → 双方各获得一颗独立宠物蛋
→ A、B分别孵化 → 生成两条不同宠物记录
```

## 测试账号

测试数据只在非生产环境通过幂等接口创建，不包含密码，也不会覆盖已有用户宠物。

| 用户 | userId | openid | 昵称 | 本地预览 |
|---|---:|---|---|---|
| A | 201 | `petverse_social_a` | 星愿玩家A | `?userId=201` |
| B | 202 | `petverse_social_b` | 月愿玩家B | `?userId=202` |

客户端会把查询参数中的 `userId` 写入 `X-User-Id` 请求头，因此两个浏览器标签是真实的独立后端用户，不是前端假切换。

## 现有系统审计与本次补全

项目原有好友申请、好友关系、婚礼申请、婚姻、宠物蛋、孵化器和后代生成服务。本次复用这些模块，并补齐：

- 所有资料、宠物、背包和孵化接口的真实用户上下文。
- 好友在线/最近登录、分页及查看好友公开宠物。
- 婚礼宠物性别、归属、已婚、锁定和申请占用校验。
- 接受婚礼时同一事务内创建婚姻及双方独立宠物蛋。
- 双击接受、并发接受和网络重试的幂等回放。
- 婚礼申请的拒绝、取消、过期与历史状态展示。
- 宠物总览选择弹窗和不可选原因，不再逐只按左右箭头切换。
- 双账号 Cocos 预览、独立蛋仓库和新生宠物即时刷新。

## 数据模型变化

### User

- `lastActiveAt`：最近活跃时间，用于在线/最近登录展示。
- `updatedAt`：用户记录更新时间。

### Egg

- `marriageId`：把婚礼初始蛋与婚姻记录绑定。
- 现有 `ownerId`、父母ID、`randomSeed`、`offspringData`、状态和孵化结果字段继续复用。

项目当前使用 TypeORM `synchronize`，本阶段没有重置数据库、删除用户数据或修改 `.env`。部署到正式环境前应将上述字段转为正式迁移。

## API

### 开发测试

- `POST /api/dev/seed-social`：幂等准备账号201、202及各自五只测试宠物，仅非生产环境可用。

### 好友

- `GET /api/friend?page=&pageSize=`：好友列表、在线/最近登录状态。
- `GET /api/friend/search?keyword=`：按用户ID、昵称或 openid 搜索。
- `GET /api/friend/:friendUserId/pets`：好友关系校验后的公开宠物。
- `POST /api/friend/request`：发送好友申请。
- `GET /api/friend/requests/incoming`：收到的申请。
- `GET /api/friend/requests/outgoing`：发出的申请。
- `POST /api/friend/request/:id/accept`：接受。
- `POST /api/friend/request/:id/reject`：拒绝。
- `POST /api/friend/remove`：双向删除好友关系。

### 婚礼与宠物蛋

- `GET /api/marriage`：已结缘记录及对方玩家资料。
- `GET /api/marriage/proposals`：收到、发出及历史申请。
- `POST /api/marriage/proposals`：发起申请。
- `POST /api/marriage/proposals/:id/respond`：接受或拒绝。
- `POST /api/marriage/proposals/:id/cancel`：幂等撤回。
- `GET /api/hatchery/eggs`：当前账号的蛋仓库和三个孵化槽。
- `POST /api/hatchery/start`：把指定蛋放入指定孵化槽。
- `POST /api/hatchery/hatch`：领取后端已固定的孵化结果。

上述用户接口统一读取 `X-User-Id`，未提供时仍兼容原默认测试用户。

## 婚礼事务与防重复

接受申请时执行单个数据库事务：

1. 悲观锁定申请记录。
2. 重新读取并锁定双方宠物。
3. 再次校验好友、归属、异性、未婚、未锁定和申请占用状态。
4. 创建唯一婚姻并写入双方宠物婚姻状态。
5. 为账号A创建 `marriage_initial` 蛋。
6. 为账号B创建另一条 `marriage_initial` 蛋。
7. 将申请状态更新为 `completed`。
8. 一次性提交；任何步骤失败则整体回滚。

重复接受已经完成的申请时，服务端返回原婚姻和原两颗蛋，并标记 `duplicate: true`，不会重复建婚姻或发蛋。

## 后代生成规则

双方宠物蛋复用 `PetService.buildOffspringBlueprint`。同一婚姻使用不同 owner seed：

```text
marriage-{marriageId}-owner-{ownerId}-initial
```

因此两颗蛋拥有相同父母和婚姻ID，但 eggId、随机种子与最终宠物实例彼此独立。物种、稀有度、成长、资质、性别、技能槽和技能继承均由服务端一次生成并保存在蛋记录中，刷新页面不会重新随机。

概率与继承实现位置：

- `server/src/modules/pet/pet.service.ts`
- `server/src/modules/marriage/marriage.service.ts`
- 蛋记录中的 `configVersion` 和 `offspringData`

## 自动验收结果

`node scripts/verify-social-closure.mjs`：

- 好友申请拒绝、再次申请与接受通过。
- 婚礼申请拒绝、再次申请与接受通过。
- 并发双击接受只有一次真实提交，另一次为幂等回放。
- 已婚宠物再次申请被阻止。
- 两颗初始蛋 ID 为 17、18，归属分别为201、202，随机种子不同。

`node scripts/verify-social-hatch.mjs`：

| 账号 | eggId | petId | 性别 | 成长 | 技能槽 |
|---|---:|---:|---|---:|---:|
| 201 | 17 | 32 | 母 | 1.091 | 3 |
| 202 | 18 | 31 | 公 | 1.102 | 4 |

两边生成了不同的持久化宠物记录，性别、成长和技能槽数量也独立。

## 720×1280 实际预览截图

- `docs/validation/social-closure/01-account-a-home.png`
- `docs/validation/social-closure/02-account-a-friends.png`
- `docs/validation/social-closure/03-account-a-wedding-match.png`
- `docs/validation/social-closure/04-account-a-pet-picker.png`
- `docs/validation/social-closure/05-account-a-married.png`
- `docs/validation/social-closure/06-account-a-applications.png`
- `docs/validation/social-closure/07-account-a-egg.png`
- `docs/validation/social-closure/08-account-b-home.png`
- `docs/validation/social-closure/09-account-b-egg.png`
- `docs/validation/social-closure/10-account-a-new-pet.png`
- `docs/validation/social-closure/11-account-b-new-pet.png`
- `docs/validation/social-closure/12-account-a-friend-search.png`

Cocos 两个账号预览的浏览器控制台均无新增 `warning` 或 `error`。
