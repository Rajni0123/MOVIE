import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import os from "os";
import { execSync } from "child_process";

// GET /api/admin/server-status - Get server stats
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    // CPU Info
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model || "Unknown";
    const cpuCores = cpus.length;

    // Calculate CPU usage
    const cpuUsage = getCpuUsage();

    // Memory Info
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = ((usedMemory / totalMemory) * 100).toFixed(1);

    // System Info
    const uptime = os.uptime();
    const platform = os.platform();
    const hostname = os.hostname();
    const nodeVersion = process.version;

    // Disk usage (Linux only)
    let diskInfo = { total: 0, used: 0, free: 0, percent: 0 };
    try {
      if (platform === "linux") {
        const dfOutput = execSync("df -B1 / | tail -1").toString().trim();
        const parts = dfOutput.split(/\s+/);
        if (parts.length >= 4) {
          diskInfo = {
            total: parseInt(parts[1]) || 0,
            used: parseInt(parts[2]) || 0,
            free: parseInt(parts[3]) || 0,
            percent: parseFloat(parts[4]?.replace("%", "") || "0"),
          };
        }
      }
    } catch {
      // Disk info not available
    }

    // Process memory
    const processMemory = process.memoryUsage();

    // Network interfaces
    const networkInterfaces = os.networkInterfaces();
    const primaryIP = Object.values(networkInterfaces)
      .flat()
      .find((iface) => iface && !iface.internal && iface.family === "IPv4")?.address || "N/A";

    // Load average (Linux/Mac)
    const loadAvg = os.loadaverage();

    // PM2 process info (if available)
    let pm2Info = null;
    try {
      if (platform === "linux") {
        const pm2Output = execSync("pm2 jlist 2>/dev/null").toString();
        const pm2Data = JSON.parse(pm2Output);
        const movpixProcess = pm2Data.find((p: { name: string }) => p.name === "movpix");
        if (movpixProcess) {
          pm2Info = {
            name: movpixProcess.name,
            status: movpixProcess.pm2_env?.status,
            uptime: movpixProcess.pm2_env?.pm_uptime,
            restarts: movpixProcess.pm2_env?.restart_time,
            memory: movpixProcess.monit?.memory,
            cpu: movpixProcess.monit?.cpu,
          };
        }
      }
    } catch {
      // PM2 not available
    }

    return NextResponse.json({
      success: true,
      data: {
        cpu: {
          model: cpuModel,
          cores: cpuCores,
          usage: cpuUsage,
          loadAvg: {
            "1min": loadAvg[0]?.toFixed(2) || 0,
            "5min": loadAvg[1]?.toFixed(2) || 0,
            "15min": loadAvg[2]?.toFixed(2) || 0,
          },
        },
        memory: {
          total: totalMemory,
          used: usedMemory,
          free: freeMemory,
          usagePercent: parseFloat(memoryUsagePercent),
        },
        disk: diskInfo,
        system: {
          platform,
          hostname,
          uptime,
          nodeVersion,
          primaryIP,
        },
        process: {
          pid: process.pid,
          heapUsed: processMemory.heapUsed,
          heapTotal: processMemory.heapTotal,
          rss: processMemory.rss,
          external: processMemory.external,
        },
        pm2: pm2Info,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error("Server status error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get server status" },
      { status: 500 }
    );
  }
}

// Calculate CPU usage percentage
function getCpuUsage(): number {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  }

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = ((total - idle) / total) * 100;

  return parseFloat(usage.toFixed(1));
}
