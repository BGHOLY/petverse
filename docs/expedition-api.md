# 轻量远征 API

统一前缀：`/api/expedition`

除配置外，接口通过 `X-User-Id` 使用当前请求账号；未提供时兼容默认测试账号。

## 获取配置

`GET /api/expedition/config`

返回四张地图、允许时长、地图偏好元素/定位和版本号。

## 开始远征

`POST /api/expedition/start`

请求：

```json
{
  "mapCode": "forest",
  "durationMinutes": 120,
  "petIds": [1, 2, 3, 4, 5],
  "requestId": "client-generated-unique-id"
}
```

规则：

- `mapCode`：`forest`、`volcano`、`icefield`、`ruins`。
- `durationMinutes`：30、120、240、480。
- `petIds`：1～5 只，不能重复。
- 同一宠物不能参加两支未领取远征。
- `requestId` 用于防止重复点击产生两支相同远征。

## 获取进行中远征

`GET /api/expedition/active`

返回服务器时间、剩余秒数和 `ready` 状态。

## 领取奖励

`POST /api/expedition/claim`

```json
{
  "expeditionId": 1
}
```

- 到期前不能领取。
- 同一远征不能重复领取。
- 金币、宠物经验和道具由服务器结算。

## 历史记录

`GET /api/expedition/history`

返回当前用户最近的远征记录和已领取奖励。

## 开发环境快速完成

`POST /api/expedition/dev/complete`

```json
{
  "expeditionId": 1
}
```

仅非生产环境可用。

## 地图规则

- 月光森林：均衡收益。
- 余烬火山：水系宠物提高收益。
- 霜语冰原：火系宠物提高收益。
- 星辉遗迹：控制、辅助、治疗、净化或护盾定位提高稀有掉落。

宠物不会死亡或永久丢失。

