import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export function logApi(event: {
  name: string;
  start: number;
  ok: boolean;
  status: number;
  targetHost?: string;
  error?: string;
}){
  const durationMs = Date.now() - event.start;
  logger.info({
    type: 'api',
    name: event.name,
    ok: event.ok,
    status: event.status,
    targetHost: event.targetHost,
    durationMs
  }, `api:${event.name} ${event.ok?'ok':'fail'} ${event.status} ${durationMs}ms`);
}

export default logger;


