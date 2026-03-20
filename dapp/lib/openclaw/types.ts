export type OpenClawChatInput = {
  prompt: string;
  walletAddress?: string;
  chainId?: number;
};

export type OpenClawChatResult = {
  text: string;
  raw?: unknown;
};

export type OpenClawGatewayPayload = {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  metadata?: Record<string, string | number | boolean>;
};
