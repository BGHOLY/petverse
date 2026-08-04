# PetVerse V12 正式测试准备

## 已完成的生产化底座

- 客户端不再把 `127.0.0.1` 固化到 `MainScene`。
- 本地预览自动使用 `http://127.0.0.1:3000/api`。
- 微信环境优先读取 `wx.getExtConfigSync().apiBaseUrl`。
- 也可在启动前设置 `globalThis.PETVERSE_API_BASE_URL` 或 `globalThis.PETVERSE_CONFIG.apiBaseUrl`。
- 登录成功后，令牌和真实账号 ID 会同步交给所有页面使用；不再回落到默认测试账号。
- 正式环境默认禁用数据库自动同步、测试账号请求头和所有种子/开发接口。
- 正式环境的每个私有请求必须携带有效 JWT；令牌中的用户 ID 会覆盖客户端伪造的 `X-User-Id`。
- 宠物详情只能读取当前登录账号拥有的宠物。
- 微信包使用 `wx.login` 获取一次性 `code`，服务端再通过微信接口换取 `openid`；正式环境不接受客户端直接提交 `openid`。
- 自动测试登录已从正式启动场景禁用，启动页已使用温馨小屋和 Mochi 正式视觉。
- 全新账号会获得一支已锁定的五宠阵容（坦克、治疗、法系、物理、辅助），以及少量经验药、普通宠物蛋和炼妖材料。
- 新手赠送只在创建新账号或修复中断的新手初始化时执行，不覆盖旧账号、不重复补领。

## 本地测试

复制 `server/.env.example` 为 `server/.env`，保持：

```text
NODE_ENV=development
DB_SYNCHRONIZE=true
```

本地 Cocos 预览不需要手工配置 API 地址。

## 外部测试服务器

正式测试环境至少需要：

```text
NODE_ENV=production
JWT_SECRET=<独立且不少于32字符的随机密钥>
DB_SYNCHRONIZE=false
ALLOW_TEST_USER_HEADER=false
CORS_ORIGINS=https://你的网页测试域名
WX_APPID=<微信小游戏 AppID>
WX_SECRET=<只保存在服务端的 AppSecret>
```

微信小游戏必须在微信公众平台配置合法的 HTTPS request 域名。API 地址应包含 `/api`，例如：

```text
https://api.example.com/api
```

## 客户端 API 地址注入

任选一种方式：

1. 微信第三方/扩展配置：`extConfig.apiBaseUrl`；
2. 在小游戏启动脚本中设置 `globalThis.PETVERSE_API_BASE_URL`；
3. 发布前填写 `ApiConfig.PROD_BASE_URL`。

如果正式包没有配置服务器地址，客户端会明确显示配置错误，不会悄悄请求玩家电脑上的本机服务。

## 发布前强制检查

```text
server lint
server unit tests
server e2e tests
server build
client TypeScript check
UI architecture audit
UI input audit
V12 readiness audit
V12 release audit
production-mode smoke test
V12 dual-account marriage smoke test
git diff --check
```

## 结缘与共同孕育

- 结缘通过后，双方立即各获得一枚同源、独立计算结果的宠物蛋。
- 后续共同孕育由双方轮流发起；发起方支付金币和繁育凭证，双方各消耗20点生育力。
- 每次共同孕育后，双方仍然各获得一枚独立结果的宠物蛋。
- 正式环境冷却72小时；开发与自动测试环境默认60秒，并允许通过环境变量覆盖。
- 不设置终身繁育次数硬上限；历史次数继续记录，用于档案、成就和运营分析。
- 使用 `node scripts/smoke-v12-marriage.mjs` 可在开发服务器上验证双账号、双蛋、独立随机与重复请求保护。

外部测试前仍需由项目方提供最终 HTTPS API 域名和微信小游戏 AppID；这两项不能由代码自动推断。
