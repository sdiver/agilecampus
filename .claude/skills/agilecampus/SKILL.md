---
name: agilecampus
description: 向 AgileCampus 敏捷校园写入数据——添加任务、填写任务完成情况、登记资源占用。当用户说"给项目X加任务Y""把任务Z标记完成，情况是…""登记我占用了 GPU-01 三小时""记一下我用了某资源"时触发。需事先配置 AGILECAMPUS_URL 与 AGILECAMPUS_TOKEN。
---

# AgileCampus 写入

通过 Personal API Token 以用户身份向 AgileCampus 写入。所有请求走 `/api/agent/*`，携 `Authorization: Bearer <token>`。

## 前置配置

需要两个环境变量（用户在网页「设置 → 个人访问令牌」生成令牌）：

- `AGILECAMPUS_URL`：站点地址，如 `http://localhost:3000`
- `AGILECAMPUS_TOKEN`：令牌明文

**若两者任一缺失**，先停下，引导用户：①登录 AgileCampus →「设置 → 个人访问令牌」生成令牌（明文只显一次）；②把令牌与站点地址配置为上述环境变量（如写入 shell profile 或 `.env`）。配齐后再继续。

## 三类写入

用 `curl` 调用，读取环境变量，勿把令牌明文写进任何文件或回显。

### 添加任务

需要 `projectId`（uuid）与 `title`。可选 `description`、`assigneeId`、`dueDate`（`YYYY-MM-DD`）、`milestoneId`、`priority`（`low`/`medium`/`high`）。

```bash
curl -sS -X POST "$AGILECAMPUS_URL/api/agent/tasks" \
  -H "Authorization: Bearer $AGILECAMPUS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<uuid>","title":"<标题>","priority":"medium"}'
```

### 填写完成情况（标记完成）

需要 `taskId`（uuid）与 `completionNote`（完成说明）。会把任务置为 `done`。

```bash
curl -sS -X POST "$AGILECAMPUS_URL/api/agent/tasks/complete" \
  -H "Authorization: Bearer $AGILECAMPUS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"taskId":"<uuid>","completionNote":"<完成说明>"}'
```

### 登记资源占用

需要 `teamId`（uuid）、`resourceName`、`startTime`（ISO 8601）。可选 `purpose`、`endTime`（省略 = 占用中）。

```bash
curl -sS -X POST "$AGILECAMPUS_URL/api/agent/resource-usage" \
  -H "Authorization: Bearer $AGILECAMPUS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"teamId":"<uuid>","resourceName":"GPU-01","purpose":"训练模型","startTime":"2026-07-22T14:00:00Z"}'
```

## 要点

- **需要 uuid 而用户只给了名字**（如项目名、团队名）时，先向用户确认对应 id，或让用户从网页地址栏取（`/projects/<projectId>`、`/teams/<teamId>/...`）。不要臆造 uuid。
- **解读响应状态**：`200` 成功；`400` 参数错；`401` 令牌无效/缺失/已撤销（提示重新配置或重新生成）；`403` 越权（该令牌主人对目标项目/团队无权限）；`500` 可重试。
- **绝不回显或落盘令牌明文**。
- 完整契约见项目内 `docs/agent-api.md`。
