/**
 * @module logger
 * Logger estruturado do InovaCalc Mobile.
 *
 * Níveis: DEBUG < INFO < WARN < ERROR
 * - __DEV__: todos os níveis exibidos no console com cores ANSI
 * - Produção: apenas WARN e ERROR chegam ao console
 *
 * Os últimos MAX_ENTRIES logs ficam em memória para diagnóstico em tela
 * (ex.: tela de ajuda / configurações avançadas).
 */

/** Constante injetada pelo Metro/Babel. */
declare const __DEV__: boolean;

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  level: LogLevel;
  tag: string;
  message: string;
  data?: unknown;
  timestamp: string;
}

const MAX_ENTRIES = 300;
const buffer: LogEntry[] = [];

const COLORS: Record<LogLevel, string> = {
  DEBUG: '\x1b[36m', // cyan
  INFO:  '\x1b[32m', // green
  WARN:  '\x1b[33m', // yellow
  ERROR: '\x1b[31m', // red
};
const RESET = '\x1b[0m';

function record(level: LogLevel, tag: string, message: string, data?: unknown): void {
  const entry: LogEntry = {
    level,
    tag,
    message,
    ...(data !== undefined ? { data } : {}),
    timestamp: new Date().toISOString(),
  };

  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();

  // Suprime DEBUG/INFO em produção
  if (!__DEV__ && (level === 'DEBUG' || level === 'INFO')) return;

  const prefix = `${COLORS[level]}[${level}][${tag}]${RESET}`;
  if (data !== undefined) {
    // eslint-disable-next-line no-console
    console.log(`${prefix} ${message}`, data);
  } else {
    // eslint-disable-next-line no-console
    console.log(`${prefix} ${message}`);
  }
}

export const logger = {
  debug: (tag: string, msg: string, data?: unknown) => record('DEBUG', tag, msg, data),
  info:  (tag: string, msg: string, data?: unknown) => record('INFO',  tag, msg, data),
  warn:  (tag: string, msg: string, data?: unknown) => record('WARN',  tag, msg, data),
  error: (tag: string, msg: string, data?: unknown) => record('ERROR', tag, msg, data),

  /** Retorna cópia do buffer de logs em memória. Útil para tela de diagnóstico. */
  getLogs: (): readonly LogEntry[] => [...buffer],

  /** Limpa o buffer. */
  clearLogs: (): void => { buffer.length = 0; },
};
