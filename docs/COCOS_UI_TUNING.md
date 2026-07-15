# Cocos UI 微调

项目使用 Cocos Creator 3.8.8，主要界面由 `MainUI` 在编辑器和运行时生成。

## 在编辑器中预览

1. 打开 `assets/scenes/MainScene.scene`。
2. 在层级管理器选择挂载 `MainUI` 的节点。
3. 在检查器的 `MainUI` 组件中修改“编辑器预览页面”。
4. 可分别调整宠物页、商店页、背包页和孵化室的偏移与缩放。
5. 调整完成后保存场景，运行时会读取同一组参数。

## 建议范围

- 页面偏移：通常保持在 `-20` 至 `20`。
- 页面缩放：通常保持在 `0.95` 至 `1.02`。
- 需要改动单个控件时，可在编辑器预览生成后查看对应节点名称，再回到 `MainUI.ts` 调整该节点的坐标。

背景资源位于：

- `assets/resources/ui/pet-v3/`
- `assets/resources/ui/shop-v3/`
- `assets/resources/ui/inventory-v3/`
- `assets/resources/ui/hatchery-v3/`
