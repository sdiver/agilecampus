import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { AppError } from "@/lib/errors";

// 仅在生产（route 未注入 model）时调用；测试注入 MockLanguageModelV2，不触达此函数
export function getModel(): LanguageModel {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new AppError("DeepSeek 未配置：请在 .env 设置 DEEPSEEK_API_KEY");
  const deepseek = createOpenAICompatible({
    name: "deepseek",
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return deepseek("deepseek-chat");
}
