import pino from 'pino';
import { env, isDev } from '../config/env';

/**
 * Application logger (pino). Pretty-printed in development; structured JSON
 * everywhere else (prod/test/CI) so logs are machine-parseable.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'cslifestyle-api' },
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }
    : {}),
});

export type Logger = typeof logger;
