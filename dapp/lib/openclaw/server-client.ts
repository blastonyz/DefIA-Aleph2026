import type {
  OpenClawChatInput,
  OpenClawChatResult,
  OpenClawGatewayPayload,
} from "@/lib/openclaw/types";
import { createHmac } from "node:crypto";

const DEFAULT_OPENCLAW_ENDPOINT = "/v1/chat/completions";
const FALLBACK_OPENCLAW_ENDPOINT = "/v1/responses";

export async function sendOpenClawChat(input: OpenClawChatInput): Promise<OpenClawChatResult> {
  const baseUrl = process.env.OPENCLAW_BASE_URL?.trim();
  const token = process.env.OPENCLAW_GATEWAY_TOKEN?.trim();
  const endpoint = process.env.OPENCLAW_CHAT_ENDPOINT?.trim() || DEFAULT_OPENCLAW_ENDPOINT;

  if (!baseUrl) {
    throw new Error("Missing OPENCLAW_BASE_URL");
  }
  if (!token) {
    throw new Error("Missing OPENCLAW_GATEWAY_TOKEN");
  }

  const payload: OpenClawGatewayPayload = {
    messages: [
      {
        role: "system",
        content:
          "You are a DeFi text-only assistant. You MUST respond with plain text only. " +
          "Do NOT use any tools, plugins, ACP sessions, runtime backends, or external calls. " +
          "Do NOT attempt to execute trades or access external systems. " +
          "When asked for a trading action, respond with a single line starting with ACTION: followed by LONG, SHORT, or CLOSE, then a brief reason. " +
          "Keep all responses concise and direct.",
      },
      {
        role: "user",
        content: input.prompt,
      },
    ],
    metadata: {
      walletAddress: input.walletAddress ?? "unknown",
      chainId: input.chainId ?? 43114,
    },
  };

  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const response = await postGateway(normalizedBaseUrl, endpoint, token, payload);
  const finalResponse =
    response.status === 404 && endpoint !== FALLBACK_OPENCLAW_ENDPOINT
      ? await postGateway(normalizedBaseUrl, FALLBACK_OPENCLAW_ENDPOINT, token, payload)
      : response;

  if (!finalResponse.ok) {
    const body = await safeText(finalResponse);
    if (finalResponse.status === 404) {
      throw new Error(
        "OpenClaw HTTP API disabled (404). Enable gateway.http.endpoints.chatCompletions.enabled=true or gateway.http.endpoints.responses.enabled=true in OpenClaw config.",
      );
    }
    throw new Error(`OpenClaw request failed (${finalResponse.status}): ${body}`);
  }

  const json = (await finalResponse.json()) as Record<string, unknown>;
  return {
    text: extractText(json),
    raw: json,
  };
}

async function postGateway(
  baseUrl: string,
  endpoint: string,
  token: string,
  payload: OpenClawGatewayPayload,
): Promise<Response> {
  const hmacSecret = process.env.OPENCLAW_GATEWAY_HMAC_SECRET?.trim();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  };

  if (hmacSecret) {
    const timestamp = Date.now().toString();
    const signature = createHmac("sha256", hmacSecret)
      .update(`${timestamp}.POST.${endpoint}`)
      .digest("hex");

    headers["x-openclaw-timestamp"] = timestamp;
    headers["x-openclaw-signature"] = `sha256=${signature}`;
  }

  return await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

function extractText(json: Record<string, unknown>): string {
  if (typeof json.output === "string") {
    return json.output;
  }
  if (typeof json.message === "string") {
    return json.message;
  }
  if (Array.isArray(json.choices) && json.choices.length > 0) {
    const first = json.choices[0] as Record<string, unknown>;
    const message = first.message as Record<string, unknown> | undefined;
    if (message && typeof message.content === "string") {
      return message.content;
    }
  }
  return JSON.stringify(json);
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "<empty body>";
  }
}
