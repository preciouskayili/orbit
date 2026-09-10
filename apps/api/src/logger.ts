import { AsyncLocalStorage } from "node:async_hooks";

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

// Accept explicit fields, never request/response objects or SDK exceptions:
// those can contain authorization headers and signed desktop URLs.
export function log(level: Level, event: string, fields: Fields = {}) {
  const configured = process.env.LOG_LEVEL as Level | undefined;

  if (levels[level] < (levels[configured ?? "info"] ?? levels.info)) return;

  const record = JSON.stringify({
    time: new Date().toISOString(),
    level,
    event,
    requestId: requestContext.getStore(),
    ...fields,
  });

  if (level === "error") console.error(record);
  else if (level === "warn") console.warn(record);
  else console.log(record);
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
