# Cocos UI 微调

项目使用 Cocos Creator 3.8.8。新版界面由 `MainUI` 生成，同时把首页关键美术资源和编辑器预览状态序列化到 `MainScene.scene`。

## 首次刷新

1. 修改或拉取 UI 代码后运行：

   ```powershell
   node scripts/sync-cocos-scene-editor-preview.mjs
   ```

2. 回到 Cocos Creator。如果场景仍显示旧画面，关闭并重新打开 `assets/scenes/MainScene.scene`。
3. 确认层级管理器中的旧 `HomeLayer`、`PageLayer` 为停用状态，新版 `PetVerseUIRoot` 为启用状态。

## 在编辑器中预览

1. 在层级管理器选择 `Canvas`。
2. 在属性检查器找到 `MainUI` 组件。
3. 修改“编辑器预览页面”，可切换首页、宠物、商店、背包、孵化室和冒险。
4. 使用页面整体偏移、整体缩放或各页面独立偏移/缩放进行微调。
5. 调整完成后保存 `MainScene.scene`。

建议偏移保持在 `-20` 至 `20`，缩放保持在 `0.95` 至 `1.02`。运行时会继续使用相同参数，不会改变后端接口。

## 检查同步状态

```powershell
node scripts/sync-cocos-scene-editor-preview.mjs --check
node verify-ui-stage7.mjs
```

页面美术资源位于：

- `assets/resources/ui/pet-v3/`
- `assets/resources/ui/shop-v3/`
- `assets/resources/ui/inventory-v3/`
- `assets/resources/ui/hatchery-v3/`
- `assets/resources/ui/home-v3/`
- `assets/resources/ui/home-v4/`
