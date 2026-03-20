import { NextRequest, NextResponse } from "next/server";
import { sendMoltbotChat } from "@/lib/moltbot/server-client";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      prompt?: unknown;
      walletAddress?: unknown;
      chainId?: unknown;
    };

    const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const walletAddress =
      typeof payload.walletAddress === "string" && payload.walletAddress.trim().length > 0
        ? payload.walletAddress.trim()
        : undefined;
    const parsedChainId =
      typeof payload.chainId === "number"
        ? payload.chainId
        : typeof payload.chainId === "string" && payload.chainId.trim().length > 0
          ? Number(payload.chainId)
          : undefined;

    const chainId = Number.isFinite(parsedChainId) ? parsedChainId : undefined;

    const result = await sendMoltbotChat({
      prompt,
      walletAddress,
      chainId,
    });

    return NextResponse.json({
      text: result.text,
      provider: result.provider,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
