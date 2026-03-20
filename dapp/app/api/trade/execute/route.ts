import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

type Action = "long" | "short" | "close";
type ExecError = Error & {
  code?: number | string;
  stdout?: string;
  stderr?: string;
};

export const runtime = "nodejs";

function isAction(value: unknown): value is Action {
  return value === "long" || value === "short" || value === "close";
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { action?: unknown };
    const action = typeof payload.action === "string" ? payload.action.toLowerCase() : undefined;

    if (!isAction(action)) {
      return NextResponse.json({ error: "action must be long|short|close" }, { status: 400 });
    }

    const hardhatRoot = path.resolve(process.cwd(), "../hardhat");
    const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

    const { stdout, stderr } = await execFileAsync(
      npxCommand,
      ["hardhat", "run", "scripts/account/execute-userop.ts", "--network", "arbitrum"],
      {
        cwd: hardhatRoot,
        env: {
          ...process.env,
          MOLTBOT_STRATEGY: "gmx-direct",
          MOLTBOT_GMX_ACTION: action,
        },
      }
    );

    const output = `${stdout}\n${stderr}`;
    const opHashMatch = output.match(/UserOperation hash:\s*(0x[a-fA-F0-9]{64})/);

    if (!opHashMatch) {
      return NextResponse.json(
        {
          error: "UserOp sent but hash not found in script output",
          raw: output.slice(-4000),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      action,
      opHash: opHashMatch[1],
    });
  } catch (error) {
    console.log(error);
    const execError = error as ExecError;
    const message = execError?.message || "Failed to execute trade";
    const stdout = execError?.stdout ?? "";
    const stderr = execError?.stderr ?? "";
    const combined = `${stdout}\n${stderr}`.trim();

    console.error("[trade/execute] execution failed", {
      message,
      code: execError?.code,
      stdout: stdout.slice(-2000),
      stderr: stderr.slice(-2000),
    });

    return NextResponse.json(
      {
        error: message,
        details: combined ? combined.slice(-4000) : undefined,
      },
      { status: 500 }
    );
  }
}
