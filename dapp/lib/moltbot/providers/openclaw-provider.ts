import type { MoltbotChatInput, MoltbotChatResult } from "@/lib/moltbot/types";
import { sendOpenClawChat } from "@/lib/openclaw/server-client";

export async function sendViaOpenClaw(input: MoltbotChatInput): Promise<MoltbotChatResult> {
  const response = await sendOpenClawChat(input);
  return {
    text: response.text,
    provider: "openclaw",
    raw: response.raw,
  };
}
