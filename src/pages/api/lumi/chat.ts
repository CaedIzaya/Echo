import type { ChatCompletion } from "openai/resources/chat/completions";
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import OpenAI from "openai";
import { authOptions } from "../auth/[...nextauth]";
import { db } from "~/server/db";
import { buildLumiMessages } from "~/server/lumi/prompt";
import {
  draftScopeSchema,
  emotionLabelSchema,
  futureCreatePayloadSchema,
  lumiChatRequestSchema,
  lumiModeSchema,
  lumiResponseSchema,
  type LumiResponse,
  uiActionSchema,
} from "~/server/lumi/schema";

const DEFAULT_DASHSCOPE_BASE_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1";
const DEFAULT_QWEN_MODEL = "qwen3.5-flash";

function createTraceLogger(requestId: string) {
  const startedAt = Date.now();

  return {
    mark(stage: string, extra?: Record<string, unknown>) {
      console.log("[lumi/chat] 阶段:", {
        requestId,
        stage,
        elapsedMs: Date.now() - startedAt,
        ...extra,
      });
    },
    totalElapsedMs() {
      return Date.now() - startedAt;
    },
  };
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function buildFallbackResponse(text: string): LumiResponse {
  return {
    mode: "chat",
    lumi_reply: text,
    emotion: {
      label: "neutral",
      confidence: 0.28,
    },
    draft: {
      goal: null,
      scope: "unspecified",
      micro_goals: [],
      constraints: [],
      missing_info: [],
      summary: null,
      ready_to_confirm: false,
    },
    ui_action: "none",
    future_create_payload: null,
    suggestions: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeNullableString(
  value: unknown,
  maxLength: number,
): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function sanitizeRequiredString(
  value: unknown,
  fallback: string,
  maxLength: number,
): string {
  const sanitized = sanitizeNullableString(value, maxLength);
  return sanitized ?? fallback;
}

function sanitizeStringArray(
  value: unknown,
  maxItems: number,
  maxItemLength: number,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => item.slice(0, maxItemLength));
}

function sanitizeFutureCreatePayload(value: unknown): LumiResponse["future_create_payload"] {
  if (value === null || value === undefined) {
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const sanitized = {
    action:
      value.action === "create_project" ||
      value.action === "add_milestones" ||
      value.action === "undecided"
        ? value.action
        : "undecided",
    projectId: sanitizeNullableString(value.projectId, 120),
    name: sanitizeNullableString(value.name, 120),
    description: sanitizeNullableString(value.description, 300),
    dailyGoalMinutes:
      typeof value.dailyGoalMinutes === "number" &&
      Number.isInteger(value.dailyGoalMinutes) &&
      value.dailyGoalMinutes >= 1 &&
      value.dailyGoalMinutes <= 720
        ? value.dailyGoalMinutes
        : null,
    scope: draftScopeSchema.safeParse(value.scope).success
      ? value.scope
      : "unspecified",
    milestones: Array.isArray(value.milestones)
      ? value.milestones
          .filter(isRecord)
          .map((item) => ({
            title: sanitizeRequiredString(item.title, "待补充", 120),
          }))
          .slice(0, 5)
      : [],
    ready: typeof value.ready === "boolean" ? value.ready : false,
    source: "lumi" as const,
  };

  const parsed = futureCreatePayloadSchema.safeParse(sanitized);
  return parsed.success ? parsed.data : null;
}

function normalizeLumiResponse(raw: unknown): LumiResponse {
  const fallback = buildFallbackResponse(
    "我在这儿。你刚刚这句话，我先轻轻接住。要不要换个说法，再告诉我一次？",
  );

  if (!isRecord(raw)) {
    return fallback;
  }

  const rawEmotion = isRecord(raw.emotion) ? raw.emotion : {};
  const rawDraft = isRecord(raw.draft) ? raw.draft : {};
  const normalized = {
    mode: lumiModeSchema.safeParse(raw.mode).success ? raw.mode : fallback.mode,
    lumi_reply: sanitizeRequiredString(raw.lumi_reply, fallback.lumi_reply, 800),
    emotion: {
      label: emotionLabelSchema.safeParse(rawEmotion.label).success
        ? rawEmotion.label
        : fallback.emotion.label,
      confidence:
        typeof rawEmotion.confidence === "number" &&
        rawEmotion.confidence >= 0 &&
        rawEmotion.confidence <= 1
          ? rawEmotion.confidence
          : fallback.emotion.confidence,
    },
    draft: {
      goal: sanitizeNullableString(rawDraft.goal, 240),
      scope: draftScopeSchema.safeParse(rawDraft.scope).success
        ? rawDraft.scope
        : fallback.draft.scope,
      micro_goals: sanitizeStringArray(rawDraft.micro_goals, 3, 120),
      constraints: sanitizeStringArray(rawDraft.constraints, 4, 200),
      missing_info: sanitizeStringArray(rawDraft.missing_info, 4, 120),
      summary: sanitizeNullableString(rawDraft.summary, 400),
      ready_to_confirm:
        typeof rawDraft.ready_to_confirm === "boolean"
          ? rawDraft.ready_to_confirm
          : fallback.draft.ready_to_confirm,
    },
    ui_action: uiActionSchema.safeParse(raw.ui_action).success
      ? raw.ui_action
      : fallback.ui_action,
    future_create_payload: sanitizeFutureCreatePayload(raw.future_create_payload),
    suggestions: sanitizeStringArray(
      isRecord(raw) ? raw.suggestions : [],
      4,
      60,
    ),
  };

  const parsed = lumiResponseSchema.safeParse(normalized);
  return parsed.success ? parsed.data : fallback;
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.DASHSCOPE_API_KEY;

  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY 未配置");
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.DASHSCOPE_BASE_URL || DEFAULT_DASHSCOPE_BASE_URL,
    timeout: 12000,
    maxRetries: 1,
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const requestId = `lumi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const trace = createTraceLogger(requestId);
  let currentStage = "request_received";

  if (req.method !== "POST") {
    return res.status(405).json({ error: "方法不允许" });
  }

  trace.mark("request_received", {
    method: req.method,
  });

  currentStage = "auth_check";
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "未授权" });
  }

  trace.mark("auth_checked", {
    userId: session.user.id,
  });

  currentStage = "request_validation";
  const parsedBody = lumiChatRequestSchema.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    return res.status(400).json({
      error: "无效的请求参数",
      details: parsedBody.error.flatten(),
    });
  }

  trace.mark("request_validated", {
    userId: session.user.id,
    modePreference: parsedBody.data.modePreference,
    historyCount: parsedBody.data.history.length,
    messageLength: parsedBody.data.message.length,
  });

  try {
    currentStage = "client_init";
    const client = getOpenAIClient();
    trace.mark("client_ready", {
      model: process.env.QWEN_MODEL || DEFAULT_QWEN_MODEL,
      timeoutMs: 12000,
      maxRetries: 1,
    });

    currentStage = "fetch_context";
    let primaryProjectName: string | null = null;
    try {
      const primaryProject = await db.project.findFirst({
        where: { userId: session.user.id, isPrimary: true, isActive: true },
        select: { name: true },
      });
      primaryProjectName = primaryProject?.name ?? null;
    } catch {
      // non-critical, continue without context
    }

    currentStage = "build_messages";
    const messages = buildLumiMessages({
      ...parsedBody.data,
      primaryProjectName,
    });
    trace.mark("messages_built", {
      messageCount: messages.length,
      approxPromptChars: messages.reduce((total, message) => {
        return total + (typeof message.content === "string" ? message.content.length : 0);
      }, 0),
    });

    currentStage = "model_request";
    const completionParams = {
      model: process.env.QWEN_MODEL || DEFAULT_QWEN_MODEL,
      temperature: 0.2,
      max_tokens: 480,
      messages,
      response_format: { type: "json_object" },
      enable_thinking: false,
    } as unknown as Parameters<typeof client.chat.completions.create>[0];
    const completion = (await client.chat.completions.create(
      completionParams,
    )) as ChatCompletion;
    trace.mark("model_responded", {
      finishReason: completion.choices[0]?.finish_reason,
      usage: completion.usage,
    });

    currentStage = "extract_content";
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("模型未返回内容");
    }

    trace.mark("content_extracted", {
      contentLength: content.length,
    });

    currentStage = "extract_json";
    const extractedJson = extractJsonObject(content);
    trace.mark("json_extracted", {
      jsonLength: extractedJson.length,
    });

    currentStage = "normalize_response";
    const reply = normalizeLumiResponse(JSON.parse(extractedJson));
    trace.mark("response_normalized", {
      mode: reply.mode,
      uiAction: reply.ui_action,
    });

    console.log("[lumi/chat] 调用成功:", {
      requestId,
      userId: session.user.id,
      elapsedMs: trace.totalElapsedMs(),
      mode: reply.mode,
      uiAction: reply.ui_action,
      usage: completion.usage,
    });

    return res.status(200).json({ reply });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "未知错误";
    const errorLike = error as {
      name?: string;
      status?: number;
      code?: string;
      type?: string;
    };

    console.error("[lumi/chat] 调用失败:", {
      requestId,
      userId: session.user.id,
      stage: currentStage,
      elapsedMs: trace.totalElapsedMs(),
      errorName: errorLike.name,
      errorCode: errorLike.code,
      errorType: errorLike.type,
      status: errorLike.status,
      error: errorMessage,
    });

    return res.status(500).json({
      error: "Lumi 暂时没有接稳这句话",
      reply: buildFallbackResponse(
        "我刚刚有一点没接稳。你可以再发一次，我会继续在这里。",
      ),
      message: process.env.NODE_ENV === "development" ? errorMessage : undefined,
    });
  }
}
