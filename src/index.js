import { loadConfig } from './config.js';
import { BotManager } from './orchestrator/BotManager.js';
import { SharedMemory } from './orchestrator/SharedMemory.js';

const config = await loadConfig();
const memory = new SharedMemory();
const manager = new BotManager(config, memory);

memory.on('broadcast', ({ from, message, taskType }) => console.log(`[swarm:${taskType}] ${from}: ${message}`));
manager.start();

const shutdown = () => {
  console.log('Stopping CraftSwarm.');
  manager.stop();
  process.exit(0);
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
