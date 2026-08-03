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
git diff --check
```

外部测试前仍需由项目方提供最终 HTTPS API 域名和微信小游戏 AppID；这两项不能由代码自动推断。
