import { AsyncLocalStorage } from "node:async_hooks";
import chalk, { type ChalkInstance } from "chalk";

const requestContext = new AsyncLocalStorage<string>();

export function withRequestId(id: string, fn: () => void) {
  requestContext.run(id, fn);
}

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, string | number | boolean | undefined>;

const levels: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const levelBadge: Record<Level, string> = {
  debug: chalk.bgGray.white(" DEBUG "),
  info:  chalk.bgBlue.white(" INFO  "),
  warn:  chalk.bgYellow.black(" WARN  "),
  error: chalk.bgRed.white(" ERROR "),
};

const levelColor: Record<Level, ChalkInstance> = {
  debug: chalk.gray,
  info:  chalk.cyan,
  warn:  chalk.yellow,
  error: chalk.red,
};

function formatTimestamp(): string {
  const now = new Date();
  return chalk.gray(
    now.toLocaleTimeString("en-GB", { hour12: false }) +
    "." +
    String(now.getMilliseconds()).padStart(3, "0"),
  );
}

function formatFields(fields: Fields): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    parts.push(chalk.gray(`${key}=`) + chalk.white(String(value)));
  }
  return parts.join(chalk.gray(" · "));
}

// Accept explicit fields, never request/response objects or SDK exceptions:
// those can contain authorization headers and signed desktop URLs.
export function log(level: Level, event: string, fields: Fields = {}) {
  const configured = process.env.LOG_LEVEL as Level | undefined;

  if (levels[level] < (levels[configured ?? "info"] ?? levels.info)) return;

  const requestId = requestContext.getStore();
  const reqSlice = requestId ? chalk.gray(`[${requestId.slice(0, 8)}]`) : "";

  const eventLabel = levelColor[level](event);
  const fieldStr = formatFields(fields);

  const line = [
    formatTimestamp(),
    levelBadge[level],
    reqSlice,
    eventLabel,
    fieldStr,
  ]
    .filter(Boolean)
    .join(" ");

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function errorFields(error: unknown): Fields {
  const value = error as {
    name?: string;
    code?: string;
    status?: number;
    statusCode?: number;
  } | null;

  return {
    errorType: typeof value?.name === "string" ? value.name : "UnknownError",
    errorCode: typeof value?.code === "string" ? value.code : undefined,
    providerStatus: value?.statusCode ?? value?.status,
  };
}
