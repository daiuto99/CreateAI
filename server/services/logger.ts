import { randomUUID } from 'crypto';

type Fields = Record<string, unknown>;
type Level = 'info' | 'warn' | 'error' | 'debug';

export function requestId(req: any, _res: any, next: any) {
  req.correlationId = req.headers['x-correlation-id'] || randomUUID();
  next();
}

function line(level: Level, msg: string, extra: Fields = {}) {
  const base = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...extra,
  };
  // Single-line JSON for easy grep/ingest
  return JSON.stringify(base);
}

export const log = {
  info: (msg: string, extra?: Fields) => console.log(line('info', msg, extra)),
  warn: (msg: string, extra?: Fields) => console.warn(line('warn', msg, extra)),
  error: (msg: string, extra?: Fields) => console.error(line('error', msg, extra)),
  debug: (msg: string, extra?: Fields) => console.log(line('debug', msg, extra)),
};

export function withCtx(req: any, fields: Fields = {}) {
  return { ...fields, correlationId: req.correlationId };
}