#!/usr/bin/env bun

// @ts-ignore - Bun-specific
import { spawn } from "bun";
// @ts-ignore - Bun-specific
import { resolve, dirname } from "path";
// @ts-ignore - Bun-specific
import { fileURLToPath } from "url";

// @ts-ignore - Bun global
declare const process: any;

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

interface Service {
  name: string;
  color: string;
  cwd: string;
  command: string[];
  env?: Record<string, string>;
}

// @ts-ignore - Bun-specific
const __dirname = import.meta.dir || dirname(fileURLToPath(import.meta.url));

const services: Service[] = [
  {
    name: "Frontend",
    color: colors.cyan,
    cwd: resolve(__dirname, "..", "drawink-app"),
    command: ["bun", "run", "start", "--", "--host"],
    env: {
      VITE_APP_BACKEND_V2_GET_URL: "http://localhost:3001/api/v2/",
      VITE_APP_BACKEND_V2_POST_URL: "http://localhost:3001/api/v2/post",
    },
  },
  {
    name: "JSON Server",
    color: colors.green,
    cwd: resolve(__dirname, "..", "json-server"),
    command: ["bun", "run", "dev"],
    env: {
      PORT: "3001",
      JSON_BACKEND_PORT: "3001",
    },
  },
  {
    name: "WebSocket Server",
    color: colors.magenta,
    cwd: resolve(__dirname, "..", "websocket-server"),
    command: ["bun", "run", "dev"],
    env: {
      PORT: "3003",
      WEBSOCKET_SERVER_PORT: "3003",
      CORS_ORIGIN: "*",
    },
  },
];

function log(service: Service, message: string) {
  const prefix = `${service.color}${colors.bright}[${service.name}]${colors.reset}`;
  console.log(`${prefix} ${message}`);
}

function startService(service: Service): Promise<void> {
  return new Promise((resolve, reject) => {
    log(service, `Starting...`);

    const proc = spawn({
      cmd: service.command,
      cwd: service.cwd,
      env: {
        ...process.env,
        ...service.env,
      },
      stdout: "pipe",
      stderr: "pipe",
      stdin: "inherit",
    });

    let hasStarted = false;

    proc.stdout?.pipeTo(
      new WritableStream({
        write(chunk) {
          const text = new TextDecoder().decode(chunk);
          const lines = text.split("\n").filter((line) => line.trim());
          for (const line of lines) {
            log(service, line);
          }
          if (!hasStarted) {
            hasStarted = true;
            log(service, `${colors.green}✓ Running${colors.reset}`);
          }
        },
      })
    );

    proc.stderr?.pipeTo(
      new WritableStream({
        write(chunk) {
          const text = new TextDecoder().decode(chunk);
          const lines = text.split("\n").filter((line) => line.trim());
          for (const line of lines) {
            log(service, `${colors.yellow}${line}${colors.reset}`);
          }
        },
      })
    );

    proc.exited.then((code: number | null) => {
      if (code !== 0 && code !== null) {
        log(service, `${colors.red}✗ Exited with code ${code}${colors.reset}`);
        reject(new Error(`${service.name} exited with code ${code}`));
      } else {
        resolve();
      }
    });

    // Store process for cleanup
    (service as any).process = proc;
  });
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || "all";

  let servicesToStart: Service[] = [];

  if (mode === "frontend") {
    servicesToStart = [services[0]];
  } else if (mode === "backend") {
    servicesToStart = services.slice(1);
  } else {
    servicesToStart = services;
  }

  console.log(`${colors.bright}🚀 Starting Drawink development servers...${colors.reset}\n`);

  const processes = servicesToStart.map((service) => startService(service));

  // Handle cleanup on exit
  const cleanup = () => {
    console.log(`\n${colors.yellow}Shutting down services...${colors.reset}`);
    for (const service of servicesToStart) {
      const proc = (service as any).process;
      if (proc) {
        try {
          proc.kill();
        } catch (e) {
          // Ignore errors
        }
      }
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  try {
    await Promise.all(processes);
  } catch (error) {
    console.error(`\n${colors.red}Error starting services:${colors.reset}`, error);
    cleanup();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
