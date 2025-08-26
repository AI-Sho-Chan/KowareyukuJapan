// Simple logger implementation without external dependencies
export function logApi(event: {
  name: string;
  start: number;
  ok: boolean;
  status: number;
  targetHost?: string;
  error?: string;
}){
  const durationMs = Date.now() - event.start;
  const logLevel = event.ok ? 'info' : 'error';
  const message = `api:${event.name} ${event.ok?'ok':'fail'} ${event.status} ${durationMs}ms`;
  
  if (process.env.NODE_ENV !== 'production') {
    console[logLevel]({
      type: 'api',
      name: event.name,
      ok: event.ok,
      status: event.status,
      targetHost: event.targetHost,
      durationMs,
      error: event.error
    }, message);
  }
}