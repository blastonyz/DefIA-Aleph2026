import type { MoltbotChatInput, MoltbotChatResult, MoltbotProvider } from "@/lib/moltbot/types";
import { sendViaOpenClaw } from "@/lib/moltbot/providers/openclaw-provider";

const DEFAULT_PROVIDER: MoltbotProvider = "openclaw";

export async function sendMoltbotChat(input: MoltbotChatInput): Promise<MoltbotChatResult> {
  const provider = resolveProvider();

  switch (provider) {
    case "openclaw":
      return await sendViaOpenClaw(input);
    default:
      throw new Error(`Unsupported MOLTBOT_PROVIDER: ${provider}`);
  }
}

function resolveProvider(): MoltbotProvider {
  const provider = process.env.MOLTBOT_PROVIDER?.trim().toLowerCase();
  if (!provider) {
    return DEFAULT_PROVIDER;
  }
  if (provider === "openclaw") {
    return "openclaw";
  }
  throw new Error(`Invalid MOLTBOT_PROVIDER: ${provider}`);
}
