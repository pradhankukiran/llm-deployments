import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") || "";

  if (!name) {
    return NextResponse.json({ error: "Name parameter is required" }, { status: 400 });
  }

  try {
    // On Vercel, use the Python serverless function that streams logs using Modal SDK directly.
    const isVercel = !!process.env.VERCEL;

    if (isVercel) {
      const origin = new URL(request.url).origin;
      try {
        const res = await fetch(`${origin}/api/modal-logs?name=${encodeURIComponent(name)}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data);
        }
      } catch (fetchErr: any) {
        console.error("Failed to fetch from Python logs endpoint:", fetchErr.message);
      }
    }

    const execOpts = {
      encoding: "utf-8" as const,
      env: {
        ...process.env,
        MODAL_TOKEN_ID: process.env.MODAL_TOKEN_ID,
        MODAL_TOKEN_SECRET: process.env.MODAL_TOKEN_SECRET,
      }
    };

    // Query Modal apps list to check active tasks count and retrieve app ID
    const appsListRaw = execSync("modal app list --json", execOpts);
    const apps = JSON.parse(appsListRaw);
    
    const matchedApp = apps.find(
      (a: any) => a.Description === name || a["App ID"] === name
    );

    if (!matchedApp) {
      return NextResponse.json({
        logs: [`[system] App "${name}" not found in your deployed Modal applications.`]
      });
    }

    const tasksCount = parseInt(matchedApp.Tasks || "0", 10);
    const appId = matchedApp["App ID"];

    if (tasksCount === 0) {
      return NextResponse.json({
        logs: [
          `[system] App: ${name} (ID: ${appId})`,
          `[system] Status: ${matchedApp.State}`,
          `[system] Active Tasks: 0`,
          `[system] The model deployment is currently idle and autoscaled to zero.`,
          `[system] To trigger container startup, send a real request payload via the API Playground.`
        ]
      });
    }

    // If there are active tasks, run modal app logs with a timeout to capture stdout
    try {
      // Run for 2.5 seconds to capture active bootup/warmup logs
      const rawLogs = execSync(`timeout 2.5s modal app logs ${appId}`, {
        ...execOpts,
        stdio: ["pipe", "pipe", "ignore"] // ignore stderr to prevent hanging/crashing
      });
      
      const lines = rawLogs
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean);

      return NextResponse.json({
        logs: [
          `[system] Fetching live container telemetry logs for ${appId}...`,
          ...lines
        ]
      });
    } catch (cmdErr: any) {
      // timeout returns exit status 124, which throws in Node.js
      // Check if it produced stdout anyway
      const rawLogs = cmdErr.stdout || "";
      const lines = rawLogs
        .split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean);

      if (lines.length > 0) {
        return NextResponse.json({
          logs: [
            `[system] Fetched live container telemetry logs for ${appId}:`,
            ...lines
          ]
        });
      }

      return NextResponse.json({
        logs: [
          `[system] Connected to container ${appId} logs stream.`,
          `[system] Container is running but has not output new logs in the last 2.5s.`
        ]
      });
    }

  } catch (error: any) {
    console.error("Error fetching Modal logs:", error);
    return NextResponse.json({
      logs: [
        `[system] Error: Failed to fetch telemetry from Modal control plane.`,
        `[system] Details: ${error.message}`
      ]
    });
  }
}
