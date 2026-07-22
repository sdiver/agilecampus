import { generateText, stepCountIs, type LanguageModel } from "ai";
import { buildTools } from "./tools";
import { buildProjectSnapshot } from "./snapshot";
import {
  getOrCreateConversation,
  persistTurn,
  type ToolTraceEntry,
} from "./conversation";
import { getModel } from "./model";

const SYSTEM_PREAMBLE =
  "你是 AgileCampus 的项目管理助手。依据下方项目快照回答；需要明细时调用读工具。仅管理项目，不代做实际工作。";

export async function runAgentTurn(params: {
  actorId: string;
  projectId: string;
  userText: string;
  model?: LanguageModel;
}) {
  const { actorId, projectId, userText, model } = params;

  // 权限收敛：会话创建内部经 getProjectForUser 校验，非成员/不存在一律 ForbiddenError
  const conversation = await getOrCreateConversation(actorId, projectId);
  const snapshot = await buildProjectSnapshot(actorId, projectId);
  const tools = buildTools(actorId, projectId);

  const result = await generateText({
    model: model ?? getModel(),
    system: `${SYSTEM_PREAMBLE}\n\n${snapshot}`,
    tools,
    stopWhen: stepCountIs(5),
    messages: [{ role: "user", content: userText }],
  });

  // 工具轨迹：逐步展开 toolCalls 与对应 toolResults
  const toolTrace: ToolTraceEntry[] = result.steps.flatMap((step) =>
    step.toolCalls.map((tc, i) => ({
      toolName: tc.toolName,
      input: tc.input,
      output: step.toolResults[i]?.output,
    })),
  );

  await persistTurn(conversation.id, userText, result.text, toolTrace);

  return { conversationId: conversation.id, text: result.text, toolTrace };
}
