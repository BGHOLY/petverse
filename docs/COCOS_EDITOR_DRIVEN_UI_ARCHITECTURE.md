# PetVerseClient Cocos Creator 3.8.8 前端 UI 架构

## 协作边界

- 用户在 Cocos 编辑器中负责位置、大小、锚点、层级、图片、字体、颜色和排版。
- WORK 负责 Inspector 绑定、Prefab 实例化、数据刷新、按钮事件、页面切换和功能逻辑。
- 固定 UI 的脚本只更新数据或 `active`，不会在启动或刷新时重建节点、清空页面或写入 Transform。
- 设计分辨率继续使用 `720 × 1280`。

## MainScene 层级

```text
Canvas
└── PetVerseUIRoot
    ├── GlobalBackground
    ├── TopBar
    │   ├── Avatar
    │   ├── HomeTopArt
    │   ├── Nickname
    │   ├── Level
    │   ├── Vip
    │   ├── PlayerExp
    │   ├── GoldValue
    │   ├── DiamondValue
    │   ├── Gold
    │   ├── Diamond
    │   └── Reconnect
    ├── PageRoot
    │   ├── HomePage
    │   ├── PetPage
    │   ├── InventoryPage
    │   ├── AdventurePage
    │   ├── ShopPage
    │   ├── HatcheryPage
    │   ├── MorePage
    │   └── SecondaryPage
    ├── BottomNavigation
    ├── DrawerLayer
    ├── ModalLayer
    ├── UtilityLayer
    ├── BattleLayer
    ├── RevealLayer
    ├── GuideLayer
    ├── ToastLayer
    ├── LoadingLayer
    └── V10AudioDirector
```

这些节点仍承担页面、抽屉、弹窗、战斗、揭示动画、引导、Toast、Loading、断线重连和音频职责，因此没有做批量删除。

## 用户可自由调整的固定节点

以下节点的 Transform、Sprite、Label、字体、颜色和层级由场景保存，运行时不会重新定位：

- `GlobalBackground`
- `TopBar` 及其全部子节点
- `HomePage` 中的 `RoomArt`、`HomePetArt`、`PetNameplateArt`、`PetName`、`PetMeta`
- `HomePage` 中的宠物切换、宠物触摸、活动和快捷入口按钮
- `BottomNavigation` 中全部按钮、文字、图标和选中标记
- 八个页面根节点
- 各页面后续由用户制作的背景、标题、返回按钮和固定数据展示节点
- 七个动态列表 Prefab 内部的所有视觉子节点

按钮事件绑定到节点上的 `Button` 组件，不依赖按钮原来的坐标。移动金币、钻石、昵称、底部按钮或返回按钮不会让功能失效。

## 运行时动态节点

以下内容仍然需要根据数据或临时状态动态创建：

- 非首页旧页面中的兼容容器 `RuntimeContent`
- `PetListItem`
- `InventoryItem`
- `ShopItem`
- `HatcheryEggItem`
- `SkillSlotItem`
- `FriendListItem`
- `RankingListItem`
- Toast、Loading 内容、确认弹窗、抽屉内容和临时提示
- 战斗单位、战斗特效、结算、揭示演出和引导遮罩
- 旧页面尚未迁移完的滚动容器和临时内容卡片

动态列表只实例化对应 Prefab、填充数据和绑定点击事件，不修改 Prefab 内部的用户排版。

## 仍由脚本控制位置的节点与原因

- 列表实例在 ScrollView/Grid 中的位置：由列表数据数量和行列索引决定。
- `RuntimeContent` 内部的旧版滚动区域：属于迁移期动态内容，不是用户固定页面节点。
- 页面进入动画：从编辑器保存的位置轻微偏移后，回到同一个编辑器初始位置。
- Toast、Loading、弹窗和战斗演出：属于临时运行时层，需要动画定位。
- 宠物待机、按压缩放和战斗动画：属于交互动画；结束后恢复进入动画前记录的值。

固定首页、顶部栏、底部导航和页面根节点不在上述范围内。

## 脚本职责

### MainUI

- 初始化已有场景节点。
- 更新顶部玩家数据。
- 绑定底部导航和全局入口。
- 将旧页面渲染限制在各页面自己的 `RuntimeContent` 中。
- 不创建、清空或重排首页、顶部栏、底部导航和页面根节点。

### PanelManager

- 保存八个页面根节点的 Inspector 引用。
- 只切换页面根节点的 `active`。
- 不创建、清空或重建页面。

### 各页面模块

- 请求或接收页面数据。
- 填充固定节点和动态列表 Prefab。
- 绑定页面按钮。
- 操作完成后留在当前页面并局部刷新。

### UiKit

- 继续为迁移期动态内容、弹窗、Toast、Loading 和战斗演出提供通用绘制能力。
- 不再负责固定首页和固定导航的布局。

## 动态列表 Prefab

位置：`assets/resources/ui/list-items`

每个 Prefab 暴露：

- `Icon`
- `NameLabel`
- `CountLabel`
- `MetaLabel`
- 根节点 `Button`
- `DynamicListItemView`

用户可以直接进入 Prefab 编辑模式调整内部视觉。脚本只调用 `setData()` 更新内容。

## 新页面绑定步骤

1. 在 `PageRoot` 下创建页面根节点，设置好 Transform，并保存场景。
2. 在页面根节点下创建背景、标题、返回按钮和固定数据节点。
3. 自由摆放区域不要添加会重排子节点的 `Layout`。
4. 列表区域创建 ScrollView 和 Content；只有 Content 使用必要的 `Layout`。
5. 创建对应页面 Panel 脚本，并用 `@property(Node/Label/Button/Sprite)` 暴露引用。
6. 在 Inspector 中把节点拖到脚本属性，避免用深层路径查找。
7. 按钮逻辑通过已绑定的 `Button` 注册，不在脚本中写按钮坐标。
8. 数据刷新只修改 `Label.string`、`Sprite.spriteFrame`、进度和 `active`。
9. 动态数据项通过 Prefab 实例化；不要在页面脚本中临时拼固定卡片。
10. 将页面根节点绑定到 `PanelManager`，页面切换只调用显示/隐藏。
11. 在编辑器里移动一个数据节点和一个按钮，重新预览确认位置不变、事件仍有效。
12. 执行 TypeScript 检查和 `node scripts/audit-cocos-ui-architecture.mjs`。

## 验证

- Cocos Creator 3.8.8 脚本重新导入完成。
- 编辑器层级与预览首页一致。
- 预览首页保留编辑器中的顶部栏、宠物和底部导航位置。
- Cocos 状态栏为 0 Error。
- TypeScript `--noEmit` 通过。
- UI 架构自动审计通过。
