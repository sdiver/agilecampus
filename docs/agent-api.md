# Agent 写入 API（供 Claude Code 等外部程序调用）

这些端点让浏览器之外的程序以你的身份写入 AgileCampus——添加任务、填写完成情况、登记资源占用。

## 认证

所有 `/api/agent/*` 端点用 **Personal API Token** 认证（非浏览器 session）：

```
Authorization: Bearer <token>
```

在网页「设置 → 个人访问令牌」生成令牌，明文只显示一次。令牌权限等同于你本人：只能操作你有权限的团队/项目，越权返回 `403`。

约定两个环境变量：

- `AGILECAMPUS_URL`：本站地址，如 `http://localhost:3000`
- `AGILECAMPUS_TOKEN`：上面生成的令牌明文

## 端点

### 1. 新建任务 — `POST /api/agent/tasks`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `projectId` | uuid | 是 | 目标项目 |
| `title` | string | 是 | 任务标题 |
| `description` | string | 否 | 描述 |
| `assigneeId` | uuid | 否 | 负责人（须为团队成员） |
| `startDate` | string | 否 | 起始日 `YYYY-MM-DD`（供时间线排期） |
| `dueDate` | string | 否 | 截止日 `YYYY-MM-DD` |
| `milestoneId` | uuid | 否 | 里程碑（须属该项目） |
| `priority` | `low`\|`medium`\|`high` | 否 | 默认 `medium` |

```bash
curl -X POST "$AGILECAMPUS_URL/api/agent/tasks" \
  -H "Authorization: Bearer $AGILECAMPUS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"...","title":"撰写调研问卷","priority":"high"}'
```

### 2. 填写完成情况 — `POST /api/agent/tasks/complete`

将任务标记为 `done` 并附完成说明。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `taskId` | uuid | 是 | 目标任务 |
| `completionNote` | string | 是 | 完成说明 |

```bash
curl -X POST "$AGILECAMPUS_URL/api/agent/tasks/complete" \
  -H "Authorization: Bearer $AGILECAMPUS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"taskId":"...","completionNote":"已跑通全部演武，79 战皆捷"}'
```

### 3. 登记资源占用 — `POST /api/agent/resource-usage`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `teamId` | uuid | 是 | 目标团队 |
| `resourceName` | string | 是 | 资源名，如 `GPU-01` |
| `purpose` | string | 否 | 用途 |
| `startTime` | ISO 8601 | 是 | 开始时间，如 `2026-07-22T14:00:00Z` |
| `endTime` | ISO 8601 | 否 | 结束时间；省略 = 占用中 |

```bash
curl -X POST "$AGILECAMPUS_URL/api/agent/resource-usage" \
  -H "Authorization: Bearer $AGILECAMPUS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"teamId":"...","resourceName":"GPU-01","purpose":"训练模型","startTime":"2026-07-22T14:00:00Z"}'
```

## 响应与错误

- `200`：成功，返回创建/更新后的精简对象（含 `id`）。
- `400`：请求格式无效（缺字段、类型错、时间非法）。
- `401`：令牌缺失、畸形、伪造或已撤销。
- `403`：越权——令牌主人对目标项目/团队无权限。
- `500`：服务器错误，可重试。

## 安全说明

- 令牌库中只存 sha256 hash，明文只在生成时返回一次。
- 外部写入一律不被信任：`token → userId → lib 权限校验`，越权由业务层拒绝。
- 令牌泄露即在设置页撤销，立即失效。
