import pino from 'pino';

// Distributed Logging Configuration
// In production, this outputs raw JSON which Axiom/Datadog ingests natively.
// In development, it uses pino-pretty for human-readable console output.
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
  base: {
    env: process.env.NODE_ENV,
    app: 'veganglow-web',
  },
});
