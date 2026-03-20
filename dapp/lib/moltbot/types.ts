import type { OpenClawChatInput } from "@/lib/openclaw/types";

export type MoltbotChatInput = OpenClawChatInput;

export type MoltbotChatResult = {
  text: string;
  provider: string;
  raw?: unknown;
};

export type MoltbotProvider = "openclaw";
