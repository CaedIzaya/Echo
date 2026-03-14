import { z } from "zod";

export const lumiModeSchema = z.enum(["chat", "plan", "mixed", "safety"]);
export const lumiModePreferenceSchema = z.enum(["auto", "chat", "plan"]);
export const emotionLabelSchema = z.enum([
  "calm",
  "tired",
  "anxious",
  "confused",
  "frustrated",
  "motivated",
  "neutral",
]);
export const uiActionSchema = z.enum([
  "none",
  "show_mode_picker",
  "show_draft_card",
  "ask_followup",
  "confirm_generation",
  "switch_to_safety",
]);
export const draftScopeSchema = z.enum(["today", "this_week", "unspecified"]);

export const lumiHistoryMessageSchema = z.object({
  sender: z.enum(["user", "lumi"]),
  text: z.string().trim().min(1).max(2000),
});

export const lumiDraftSchema = z.object({
  goal: z.string().nullable(),
  scope: draftScopeSchema,
  micro_goals: z.array(z.string().min(1).max(120)).max(3),
  constraints: z.array(z.string().min(1).max(200)).max(4),
  missing_info: z.array(z.string().min(1).max(120)).max(4),
  summary: z.string().nullable(),
  ready_to_confirm: z.boolean(),
});

export const futureMilestoneSchema = z.object({
  title: z.string().min(1).max(120),
});

export const futureCreatePayloadSchema = z
  .object({
    action: z.enum(["create_project", "add_milestones", "undecided"]),
    projectId: z.string().nullable(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    dailyGoalMinutes: z.number().int().min(1).max(720).nullable(),
    scope: draftScopeSchema,
    milestones: z.array(futureMilestoneSchema).max(5),
    ready: z.boolean(),
    source: z.literal("lumi"),
  })
  .nullable();

export const lumiResponseSchema = z.object({
  mode: lumiModeSchema,
  lumi_reply: z.string().min(1).max(800),
  emotion: z.object({
    label: emotionLabelSchema,
    confidence: z.number().min(0).max(1),
  }),
  draft: lumiDraftSchema,
  ui_action: uiActionSchema,
  future_create_payload: futureCreatePayloadSchema,
  suggestions: z.array(z.string().min(1).max(60)).max(4).default([]),
});

export const lumiChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  modePreference: lumiModePreferenceSchema.default("auto"),
  history: z.array(lumiHistoryMessageSchema).max(8).default([]),
});

export type LumiMode = z.infer<typeof lumiModeSchema>;
export type LumiModePreference = z.infer<typeof lumiModePreferenceSchema>;
export type EmotionLabel = z.infer<typeof emotionLabelSchema>;
export type UiAction = z.infer<typeof uiActionSchema>;
export type DraftScope = z.infer<typeof draftScopeSchema>;
export type LumiDraft = z.infer<typeof lumiDraftSchema>;
export type FutureCreatePayload = z.infer<typeof futureCreatePayloadSchema>;
export type LumiHistoryMessage = z.infer<typeof lumiHistoryMessageSchema>;
export type LumiResponse = z.infer<typeof lumiResponseSchema>;
export type LumiChatRequest = z.infer<typeof lumiChatRequestSchema>;
