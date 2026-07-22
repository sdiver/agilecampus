# 技术债备案（作战图一审查沉淀）

内部试用可接受、市场化/正式上线前须重审的取舍：

## 安全/认证
- JWT 会话无显式失效机制，默认 30 天 maxAge——改密码后旧 token 仍有效；正式上线前设短 maxAge 或引入会话版本号
- authorize 对不存在用户不跑 bcrypt（时序侧信道可枚举邮箱）——如需弭平，对不存在用户跑固定 hash 的 compare 占位
- 最后一名 admin 可被降级/自降导致团队无管理员——lib 层补"末位 admin 不可降级"不变量
- 成员管理页对全体成员展示所有人邮箱——确认隐私合规或限 admin 可见

## 产品
- 邀请码 nanoid(10) 混大小写含 -/_，口头/板书传播不友好——可换大写字母+数字自定义字母表（去 0/O/1/I/L）
- 邀请码对全体成员明文展示——考虑仅 admin 可见
- createTeam 邀请码唯一键碰撞（概率 64^-10）无重试兜底

## 工程
- docker-compose 硬编码凭证与 .env 双源无关联机制——改 env_file/变量插值统一来源
- docker-compose 无 healthcheck——引入 depends_on 服务前补
- 团队列表查询直写在 page.tsx——再有同类需求时上提 lib 层 listMyTeams
- bcryptjs 自带类型声明，@types/bcryptjs 冗余可移除
- SALT_ROUNDS=10 为下限，可评估升 12

## 图二（骨架）简化备案
- 无项目级成员表：团队成员即可见全部团队项目（"参与的项目"从宽）
- 看板列内手动排序未做（sort_order 已建，拖拽仅改状态）
- teacher 反馈/评论功能后置（设计文档原定 MVP 后）
- 里程碑无编辑/关闭入口（仅创建与展示，状态字段已建）
- 项目无编辑/归档入口（status 字段已建）
- updateTask/deleteTask "任务不存在"先于权限返回，对非成员泄露 uuid 存在性（uuid 不可枚举，风险极低）

## 图三上（对话地基）简化备案
- 对话采请求-响应式（generateText 非流式），真流式（useChat + toUIMessageStreamResponse）后置——无密钥时流式无从离线验证
- 每项目一活跃会话（getOrCreateConversation 取最近一条），未做多会话/会话列表
- tool role 消息未独立成行：工具轨迹并入 assistant 消息的 toolCalls jsonb
- DeepSeek 真实调用未演武（离线打通策），密钥齐备后须补真实一轮问答验收
- 快照上限固定 2000 字符、超限整体降级为统计头，未做分段精细裁剪
- 工具执行走底层 lib 各自的权限校验，与编排入口 getProjectForUser 构成轻微重复查询（复用现成 lib，未优化）

## 依赖版本教训（图三上 Task 6 沉淀）
- **AI SDK provider spec 版本须对齐**：`ai@5` 依赖 `@ai-sdk/provider@2`（LanguageModelV2），`generateText` 按 `specificationVersion === "v2"` 分派；`@ai-sdk/openai-compatible@3` 却依赖 provider@4（V4），既过不了 tsc，生产 getModel 亦运行时不匹配。正解锁 `@ai-sdk/openai-compatible@^1.0.46`（依赖 provider@2），使全树 provider dedupe 至单一 2.0.3。日后若升 `ai` 至 v6/provider V4，openai-compatible 须同步回 @3。
- `ai/test` 的 `MockLanguageModelV2` 数组形式 `doGenerate: [...]` 在 5.0.218 下按 `doGenerateCalls.length`（push 后）取值，等效 1-indexed 跳过 [0]；多轮 replay 须用函数游标形式 `doGenerate: async () => script[cursor++]`。
- `ai/test` 静态 import `msw`（provider-utils 的声明依赖但未随装），须显式补 `msw` devDependency 方可离线用 mock。

## 图三下（四写兵器）简化备案
- plan_sprint 免版本校验（草案仅 taskIds 无逐任务 updatedAt）——批量归里程碑+设截止日，低冲突，MVP 可接受
- update_tasks 乐观锁比对 updatedAt.toISOString()；同一毫秒两写理论上仍可能漏检，概率极低
- update_tasks 同批次若含同一任务两条变更，versionOf 为循环前快照，第二条仍可能通过（边缘场景，MVP 不处理）
- 草案不入库持久化：仅随 assistant 消息 toolCalls 留痕 + 前端态；页面刷新后未落库的草案卡片消失（需重新对话）
- 确认卡片可编辑聚焦核心字段：update_tasks 卡仅展示 patch（不可逐字段改）
- DeepSeek 真实「拆任务→确认→落库」演武待密钥
- **批量落库非事务**（总审沉淀）：commitDraft 的 decompose/update/plan_sprint 循环无 db.transaction，中途第 k 项抛错则前 k 项已落库、请求返错、用户重试致重复；市场化前须事务化（须图二 createTask/updateTask 接受 tx 参数）
- update_tasks 中不属本项目的 taskId 被误报为"版本冲突/他人改动"（实为无效 id）——纯提示文案，无安全影响

## 图四（任务增强+总览）简化备案
- 后置任务仅防直接成环（A↔B），未做间接环（A→B→C→A）检测——简单关联，不强制阻断执行
- 完成情况(completionNote)仅编辑态填写，未做「拖入已完成时弹窗提示补充」的引导交互
- 跨项目总览为列表+任务统计，未含管理员整体看板泳道/甘特图（留后续「图五·管理视图」）
- listMyProjects 对 admin/teacher/student 一视同仁（无项目级成员表，沿图二备案）
- 后置任务多选下拉在任务多时体验一般（原生 select multiple），未做更友好的选择器

## 图五（API Token + 资源占用 + CC 写入）简化备案
- token 作用域=该用户全部权限（MVP），未做限定项目的细粒度作用域（留后续）
- token 无过期机制，仅撤销即失效；未做自动过期/轮换
- verifyApiToken 每次校验命中即写 lastUsedAt（每请求一次写），未做节流/批量
- listApiTokens 含已撤销令牌供 UI 标注状态，撤销记录不清理会累积（无软删清理任务）
- 资源名自由填写，无预定义资源池/资源实体表——同名字符串即同一资源（大小写/空格敏感）
- 时长汇总仅计已结束占用；进行中占用不计入 byUser/byResource（避免 now 引入的不确定性）
- endResourceUsage 权限=登记者本人 or 团队 admin；teacher/其他成员不可结束他人占用
- /api/agent/* 无速率限制，防滥用（限流）后置
- resource-usage 端点时间用 z.coerce.date()，时区取决于调用方传入的 ISO 串；网页表单用 datetime-local（本地墙钟）
- CC 仅「写入」（加任务/填完成/登记资源），未做「读」端点（查进度/列任务）——陛下所命
- CC skill 需用户手动配置 AGILECAMPUS_TOKEN/AGILECAMPUS_URL 环境变量；skill 未自动发现 project/team 的 uuid（需用户提供或从地址栏取）
- 尚未攻取：C 实验时间线视图、E 飞书接入（须陛下先备飞书 AppID/Secret）

## 图六·C（实验时间线甘特）简化备案
- 任务加 startDate（可空 date）；时间线取 [startDate?, dueDate?]：仅一端有值时以该端为准，单日任务补 1 天宽度
- 甘特纯 server 端渲染 + CSS 百分比定位，无缩放/拖拽/横向滚动（长跨度项目条会很细）——只读查勘视图
- 时间范围强制纳入「今日」，全部任务在远期时图会被今日拉长（现实数据近期，可接受）
- 逾期判定=status≠done 且 dueDate<今日；未设 dueDate 的任务不判逾期
- 里程碑分组按 listProjectMilestones 顺序 + 末尾「无里程碑」；未排期任务单列徽章展示，不入甘特
- 时间线为项目级；跨项目/团队总甘特未做（留后续管理视图）
- startDate 未校验 ≤ dueDate（前端可倒填）；甘特对 start>end 做防御性纠正，但 lib 未强约束
- 时间线视图只读，未做在甘特上直接拖拽改期
