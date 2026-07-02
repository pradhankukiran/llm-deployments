import { NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface LocalAppConfig {
  appName: string;
  repoId?: string;
  volumeName?: string;
  gpu?: string;
  timeout?: string;
  localPath: string;
}

interface AppListItem {
  "App ID": string;
  Description: string;
  State: string;
  Tasks: string;
  "Created at": string;
  "Stopped at": string | null;
}

interface EnrichedApp {
  appId: string;
  name: string;
  state: string;
  tasksCount: number;
  createdAt: string;
  localConfig?: LocalAppConfig;
}

function parseModalAppFile(filePath: string): LocalAppConfig | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const appNameMatch = content.match(/APP_NAME\s*=\s*["']([^"']+)["']/);
    const repoIdMatch = content.match(/MODEL_REPO_ID\s*=\s*["']([^"']+)["']/);
    const volumeNameMatch = content.match(/MODEL_VOLUME_NAME\s*=\s*["']([^"']+)["']/);
    const gpuMatch = content.match(/gpu\s*=\s*["']([^"']+)["']/);
    const timeoutMatch = content.match(/timeout\s*=\s*([^,\n\)]+)/);

    if (appNameMatch) {
      return {
        appName: appNameMatch[1],
        repoId: repoIdMatch ? repoIdMatch[1] : undefined,
        volumeName: volumeNameMatch ? volumeNameMatch[1] : undefined,
        gpu: gpuMatch ? gpuMatch[1] : "None (CPU)",
        timeout: timeoutMatch ? timeoutMatch[1].trim() : undefined,
        localPath: filePath,
      };
    }
  } catch (err) {
    console.error(`Error parsing modal app at ${filePath}:`, err);
  }
  return null;
}

function scanLocalConfigs(): Record<string, LocalAppConfig> {
  const configs: Record<string, LocalAppConfig> = {};
  const projectsDir = "/home/kiran/Projects";

  try {
    if (!fs.existsSync(projectsDir)) return configs;
    
    const dirs = fs.readdirSync(projectsDir);
    for (const dirName of dirs) {
      const fullDir = path.join(projectsDir, dirName);
      if (fs.statSync(fullDir).isDirectory()) {
        const modalAppPath = path.join(fullDir, "modal_app.py");
        if (fs.existsSync(modalAppPath)) {
          const config = parseModalAppFile(modalAppPath);
          if (config) {
            configs[config.appName] = config;
          }
        }
      }
    }
  } catch (err) {
    console.error("Error scanning local configurations:", err);
  }
  return configs;
}

export async function GET() {
  try {
    // 1. Fetch live apps from Modal CLI
    let liveApps: AppListItem[] = [];
    try {
      const output = execSync("modal app list --json", { encoding: "utf-8" });
      liveApps = JSON.parse(output);
    } catch (cliError: any) {
      console.error("Failed to run modal app list:", cliError.message);
      // Fallback apps in case CLI auth fails
      liveApps = [
        { "App ID": "ap-FqlATKzdYSuOL3LclGsY0x", "Description": "qwen36-27b-llama", "State": "deployed", "Tasks": "0", "Created at": "2026-05-12 04:06:44", "Stopped at": null },
        { "App ID": "ap-xsFJdbYMvvrBJuMO8BH4wn", "Description": "vox-populi", "State": "deployed", "Tasks": "0", "Created at": "2026-05-14 19:52:49", "Stopped at": null },
        { "App ID": "ap-n3F5R2b5qFWPJ2LUKYm7Hg", "Description": "phc-ai-health-companion", "State": "deployed", "Tasks": "0", "Created at": "2026-05-17 00:16:27", "Stopped at": null },
        { "App ID": "ap-C1NcOP2W6vSn89idZvavdV", "Description": "gemma-4-12B-OBLITERATED", "State": "deployed", "Tasks": "0", "Created at": "2026-06-13 21:48:36", "Stopped at": null },
        { "App ID": "ap-fsxplsmcmb40Wv4VwNLITC", "Description": "ideogram-4-fp8", "State": "deployed", "Tasks": "0", "Created at": "2026-06-15 01:52:12", "Stopped at": null }
      ];
    }

    // 2. Fetch live containers
    let liveContainers: any[] = [];
    try {
      const output = execSync("modal container list --json", { encoding: "utf-8" });
      liveContainers = JSON.parse(output);
    } catch (cliError: any) {
      console.error("Failed to run modal container list:", cliError.message);
    }

    // 3. Fetch live volumes
    let liveVolumes: any[] = [];
    try {
      const output = execSync("modal volume list --json", { encoding: "utf-8" });
      liveVolumes = JSON.parse(output);
    } catch (cliError: any) {
      console.error("Failed to run modal volume list:", cliError.message);
    }

    // 4. Fetch live secrets
    let liveSecrets: any[] = [];
    try {
      const output = execSync("modal secret list --json", { encoding: "utf-8" });
      liveSecrets = JSON.parse(output);
    } catch (cliError: any) {
      console.error("Failed to run modal secret list:", cliError.message);
    }

    // 5. Fetch live profile / workspace
    let activeProfile: any = null;
    try {
      const output = execSync("modal profile list --json", { encoding: "utf-8" });
      const profiles = JSON.parse(output);
      activeProfile = profiles.find((p: any) => p.active) || profiles[0] || null;
    } catch (cliError: any) {
      console.error("Failed to run modal profile list:", cliError.message);
    }

    // 6. Scan local projects for matching configurations
    const localConfigs = scanLocalConfigs();

    // 7. Merge live info with local codebase config
    const enrichedApps: EnrichedApp[] = liveApps.map((app) => {
      const name = app.Description;
      const localConfig = localConfigs[name] || undefined;
      const tasksCount = liveContainers.filter(
        (c: any) => c["App ID"] === app["App ID"] || c["App Name"] === name
      ).length;
      
      return {
        appId: app["App ID"],
        name: name,
        state: app.State,
        tasksCount: tasksCount || parseInt(app.Tasks, 10) || 0,
        createdAt: app["Created at"],
        localConfig: localConfig,
      };
    });

    return NextResponse.json({
      apps: enrichedApps,
      containers: liveContainers,
      volumes: liveVolumes,
      secrets: liveSecrets,
      profile: activeProfile
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
