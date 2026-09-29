import 'dotenv/config';
import { readFile } from 'node:fs/promises';

export async function loadConfig() {
  const raw = await readFile(new URL('../config/bots.json', import.meta.url), 'utf8');
  const config = JSON.parse(raw);
  if (!config.server?.host || !Number.isInteger(config.server.port) || !Array.isArray(config.bots) || !config.bots.length) {
    throw new Error('config/bots.json needs server host/port and at least one bot.');
  }

  const autonomousIntervalMs = Number(process.env.AUTONOMOUS_INTERVAL_MS || 30_000);
  const maxToolRounds = Number(process.env.AGENT_MAX_TOOL_ROUNDS || 1);
  if (!Number.isFinite(autonomousIntervalMs) || autonomousIntervalMs < 1_000) {
    throw new Error('AUTONOMOUS_INTERVAL_MS must be a number of at least 1000 milliseconds.');
  }
  if (!Number.isInteger(maxToolRounds) || maxToolRounds < 1) {
    throw new Error('AGENT_MAX_TOOL_ROUNDS must be a positive integer.');
  }

  return {
    ...config,
    agent: {
      maxToolRounds,
      autonomousIntervalMs
    },
    reconnectMaxDelayMs: Number(process.env.RECONNECT_MAX_DELAY_MS || 30_000),
    llm: {
      baseUrl: (process.env.LLM_BASE_URL || 'http://127.0.0.1:11434/v1').replace(/\/$/, ''),
      apiKey: process.env.LLM_API_KEY || 'ollama',
      model: process.env.LLM_MODEL || 'llama3.2'
    }
  };
}
