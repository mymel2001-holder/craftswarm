import { BotAgent } from '../agent/BotAgent.js';

export class BotManager {
  constructor(config, memory) {
    this.config = config;
    this.memory = memory;
    this.agents = new Map();
    this.attempts = new Map();
  }

  start() {
    for (const botConfig of this.config.bots) this.spawn(botConfig);
  }

  spawn(botConfig) {
    const agent = new BotAgent({
      botConfig,
      server: this.config.server,
      llm: this.config.llm,
      memory: this.memory,
      maxToolRounds: this.config.agent.maxToolRounds,
      onDisconnect: (stopped) => this.reconnect(stopped)
    });
    this.agents.set(botConfig.username, agent);
  }

  reconnect(agent) {
    const username = agent.botConfig.username;
    if (this.agents.get(username) !== agent) return;
    const attempt = (this.attempts.get(username) || 0) + 1;
    this.attempts.set(username, attempt);
    const delay = Math.min(1_000 * 2 ** (attempt - 1), this.config.reconnectMaxDelayMs);
    console.warn(`[${username}] reconnecting in ${delay}ms.`);
    setTimeout(() => this.spawn(agent.botConfig), delay).unref();
  }

  stop() {
    for (const agent of this.agents.values()) agent.quit();
    this.agents.clear();
  }
}
