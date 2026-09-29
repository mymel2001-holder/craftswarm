import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mineflayer = require('mineflayer');
const pathfinderPackage = require('mineflayer-pathfinder');
const collectBlockPackage = require('mineflayer-collectblock');
const autoEatPackage = require('mineflayer-auto-eat');
const pvpPackage = require('mineflayer-pvp');
import { buildContext } from './ContextBuilder.js';
import { LLMProvider } from './LLMProvider.js';
import { executeTool, tools } from '../tools/index.js';

const { pathfinder, Movements } = pathfinderPackage;
const { plugin: collectBlock } = collectBlockPackage;
const { loader: autoEat } = autoEatPackage;
const { plugin: pvp } = pvpPackage;

export class BotAgent {
  constructor({ botConfig, server, llm, memory, maxToolRounds, onDisconnect }) {
    this.botConfig = botConfig;
    this.server = server;
    this.memory = memory;
    this.maxToolRounds = maxToolRounds;
    this.onDisconnect = onDisconnect;
    this.llm = new LLMProvider(llm);
    this.running = false;
    this.createBot();
  }

  createBot() {
    this.bot = mineflayer.createBot({ ...this.server, username: this.botConfig.username, auth: 'offline' });
    this.bot.loadPlugin(pathfinder);
    this.bot.loadPlugin(collectBlock);
    this.bot.loadPlugin(autoEat);
    this.bot.loadPlugin(pvp);
    this.bot.once('spawn', () => {
      this.bot.pathfinder.setMovements(new Movements(this.bot, this.bot.registry));
      this.bot.autoEat.options = { priority: 'foodPoints', startAt: 14 };
      console.log(`[${this.bot.username}] spawned.`);
      this.run('Spawned. Inspect surroundings, coordinate, then work safely.');
    });
    this.bot.on('chat', (username, message) => {
      if (username !== this.bot.username) this.run(`${username} said: ${message}`);
    });
    this.bot.on('kicked', (reason) => console.warn(`[${this.bot.username}] kicked:`, reason));
    this.bot.on('error', (error) => console.error(`[${this.bot.username}] error:`, error.message));
    this.bot.on('end', () => this.onDisconnect(this));
  }

  async run(trigger) {
    if (this.running || !this.bot.entity) return;
    this.running = true;
    const messages = [{ role: 'user', content: buildContext(this.bot, trigger, this.memory) }];
    const system = `You are ${this.bot.username}, a ${this.botConfig.role} in an offline Minecraft swarm. Your goals are to create a successful society with other bots and to survive. Use tools for game actions. Never claim success before tool confirms it. Keep chat short. Coordinate through broadcastToSwarm.`;
    try {
      for (let round = 0; round < this.maxToolRounds; round += 1) {
        const reply = await this.llm.decide({ system, messages, tools });
        if (reply.content) this.bot.chat(reply.content.slice(0, 200));
        if (!reply.tool_calls?.length) break;
        messages.push(reply);
        for (const call of reply.tool_calls) {
          let content;
          try { content = await executeTool({ bot: this.bot, memory: this.memory, username: this.bot.username }, call.function.name, JSON.parse(call.function.arguments || '{}')); }
          catch (error) { content = `Tool failed: ${error.message}`; }
          messages.push({ role: 'tool', tool_call_id: call.id, content: String(content) });
        }
      }
    } catch (error) { console.error(`[${this.bot.username}] agent error:`, error.message); }
    finally { this.running = false; }
  }

  quit() { this.bot.quit('CraftSwarm shutdown'); }
}
