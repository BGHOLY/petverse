# PetVerse V12 微信小游戏发布基线

## 目标

V12 发布包以 Cocos Creator 3.8.8、720×1280 竖屏和 `LoginScene` 为启动入口。发布构建必须关闭调试信息、源码映射和未使用引擎模块，并保留现有 UI、玩法、接口与用户数据。

## 构建配置

- 配置：`client/PetVerseClient/build-configs/v12-wechatgame.json`
- 平台：`wechatgame`
- 输出：`client/PetVerseClient/build/wechatgame-v12`
- 启动场景：`LoginScene`
- 模式：Release
- MD5 缓存：开启
- 屏幕方向：竖屏

正式上传前，把构建配置中的 `touristappid` 替换为项目在微信公众平台登记的小游戏 AppID。服务器生产环境同时需要配置匹配的 `WX_APPID` 与 `WX_SECRET`，客户端不得保存微信密钥。

## 包体治理

1. 关闭当前项目未使用的物理、粒子、性能面板、视频、WebView、瓦片地图、Spine 与 DragonBones 模块。
2. 旧版根目录音乐连同 `.meta` 原样移入 `legacy-assets/audio`，不删除源文件；运行时继续使用 `resources/audio` 中的正式音乐。
3. 所有大图继续保留；当前仍被页面逻辑引用的首页、宠物、孵化和冒险图不得擅自移出运行资源目录。
4. `scripts/audit-v12-package.mjs` 负责阻止调试模块、重复音乐或超预算资源重新进入发布基线。

## 发布前验收

- 服务端 lint、build、unit、e2e 全部通过。
- 客户端 TypeScript 检查通过。
- UI 架构、输入层级、布局、核心闭环、V12 readiness、balance、release 与 package 审计全部通过。
- Cocos Creator 3.8.8 Release 构建成功，控制台 0 Error。
- 微信开发者工具中完成登录、领取新手队伍、培养、战斗、孵化、炼妖、远征、好友结婚及双方得蛋回归。
- 真机检查启动时间、内存、弱网恢复、前后台切换、文字可读性与触摸安全区。
