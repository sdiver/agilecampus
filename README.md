# AgileCampus

面向高校团队的 Agent 驱动轻量项目管理平台（MVP 开发中）。

## 本地启动

    docker compose up -d          # 启动 Postgres（首次初始化自动建 dev 与 test 两库）
    cp .env.example .env          # 填入 AUTH_SECRET（openssl rand -base64 32 生成）
    npm install
    npm run db:push               # 推送 schema 到开发库
    npm run db:push:test          # 推送 schema 到测试库
    npm run dev

> 注意：`scripts/init-test-db.sql` 仅在 Postgres 数据卷**首次初始化**时执行。
> 若修改了 init 脚本、或此前起过旧版容器导致测试库缺失，需 `docker compose down -v`
> 重建数据卷后再 `up`（会清空本地开发数据）。
>
> 本机若用 colima 提供 Docker：先 `colima start`。

## 测试

    npm test

## 技术栈

Next.js (App Router) · TypeScript · PostgreSQL 16 + Drizzle ORM · Auth.js v5 (JWT) · Vercel AI SDK v5 (DeepSeek) · Tailwind CSS · Vitest

## 主要路由

- `/teams` 我的团队（创建/加入）
- `/teams/[teamId]/members` 成员管理（admin 改角色）
- `/teams/[teamId]/projects` 项目列表（admin 创建）
- `/projects` 所有项目总览（跨团队聚合 + 任务统计）
- `/projects/[projectId]` 项目详情：里程碑 + 看板拖拽 + 任务管理 + 项目助手对话
- `/api/chat` 项目助手对话（Agent 读工具，POST）
- `/api/chat/commit` Agent 写操作草案落库（两段式确认，POST）

## 文档

- 设计：docs/superpowers/specs/2026-07-02-agilecampus-mvp-design.md
- 作战图一（地基）：docs/superpowers/plans/2026-07-02-agilecampus-plan1-foundation.md
- 作战图二（骨架）：docs/superpowers/plans/2026-07-03-agilecampus-plan2-skeleton.md
- 图三设计（灵魂·上）：docs/superpowers/specs/2026-07-22-agilecampus-plan3-agent-design.md
- 作战图三上（对话地基）：docs/superpowers/plans/2026-07-22-agilecampus-plan3a-agent-foundation.md
- 图三设计（灵魂·下）：docs/superpowers/specs/2026-07-22-agilecampus-plan3b-agent-write-design.md
- 作战图三下（四写兵器）：docs/superpowers/plans/2026-07-22-agilecampus-plan3b-agent-write-tools.md
- 作战图四（任务增强+总览）：docs/superpowers/plans/2026-07-22-agilecampus-plan4-task-detail-overview.md
- 技术债备案：docs/BACKLOG.md
