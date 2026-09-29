# Software Requirements Specification (SRS)
## LLM-Driven Multi-Agent Mineflayer Bot Swarm

---

## 1. Executive Summary & Architecture Overview

### 1.1 Purpose
This specification details the architecture and implementation guidelines for **CraftSwarm**, a multi-agent Minecraft bot manager. The system connects multiple AI-controlled Mineflayer bots to an **offline-mode Minecraft server**. Each bot operates using a **ReAct (Reason + Act)** loop powered by a Large Language Model (LLM) and executes actions via explicit **Tool Calls / Function Calling**.

### 1.2 System Architecture Diagram
```
                     +-----------------------------------+
                     |         LLM Provider API          |
                     |  (OpenAI / Anthropic / Ollama)    |
                     +-----------------+-----------------+
                                       ^
                                       | Tool Calls & Responses
                                       v
+-------------------------------------------------------------------------------------------+
| Multi-Agent Orchestrator Node Engine                                                      |
|                                                                                           |
|  +--------------------+     +-----------------------------+     +----------------------+  |
|  | Inter-Bot Router   |<--->| World Context Store         |<--->| Event / Memory Store |  |
|  | (Shared Broadcast) |     | (Quick.DB/BetterSQLite DB)  |     | (Short/Long term)    |  |
|  +---------+----------+     +-----------------------------+     +----------------------+  |
|            |                                                                              |
|            +--------------------+--------------------+                                    |
|                                 |                    |                                    |
|                                 v                    v                                    |
|                     +--------------------+  +--------------------+                        |
|                     | Bot Worker 1       |  | Bot Worker N       |                        |
|                     | - Agent Loop       |  | - Agent Loop       |                        |
|                     | - Mineflayer Client|  | - Mineflayer Client|                        |
|                     +---------+----------+  +---------+----------+                        |
+-------------------------------|----------------------|------------------------------------+
                                |                      |
                                v TCP                  v TCP
                     +-----------------------------------+
                     |     Offline Minecraft Server      |
                     |   (Paper / Spigot / Fabric)       |
                     +-----------------------------------+
```

---

## 2. Core Operational Requirements

### 2.1 Offline Mode & Multi-Bot Configuration
1. **Authentication Mode:** The system must configure `mineflayer.createBot()` with `auth: 'offline'`.
2. **Dynamic Bot Spawning:** Configuration must support spawning $N$ bots dynamically with distinct unique usernames (`Bot_Alpha`, `Bot_Beta`, etc.).
3. **Automatic Reconnection:** If a bot is kicked, encounters a packet timeout, or suffers a server crash, the bot orchestrator must auto-reconnect using exponential backoff retry.

### 2.2 LLM Reasoning & Tool Execution Engine
1. **ReAct Loop:** Bots observe the environment $\rightarrow$ reflect via LLM $\rightarrow$ output structured tool calls $\rightarrow$ execute via Mineflayer $\rightarrow$ feed back execution results.
2. **Function Calling Standard:** Use standard structured JSON Schema (OpenAI compatible function calling format) for zero-shot function invocation.
3. **Asynchronous Tool Execution:** Long-running movement tasks (e.g., pathfinding to a location 200 blocks away) must yield control to the execution engine asynchronously while providing periodic status updates back to the LLM context.

---

## 3. Tool Capabilities & Mineflayer Plugin Integration

The engine will wrap core Mineflayer API methods and plugins into deterministic tool functions exposed to the LLM.

### 3.1 Primary Mineflayer Libraries
* **`mineflayer-pathfinder`:** Navigation, A* path planning, jumping, and obstacle avoidance.
* **`mineflayer-collectblock`:** High-level API to harvest block types (e.g., `oak_log`, `iron_ore`).
* **`mineflayer-auto-eat`:** Background health and hunger management.
* **`mineflayer-pvp`:** Combat strategies and target tracking for hostiles or defense.

### 3.2 Tool Registry Schema Definition

| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `goToLocation` | `{ x: number, y: number, z: number }` | Navigates bot to target coordinates using `mineflayer-pathfinder`. |
| `followPlayer` | `{ playerName: string }` | Continuously follows a specified player or bot. |
| `mineBlock` | `{ blockName: string, count: number }` | Finds and mines $N$ blocks of specified type using `mineflayer-collectblock`. |
| `craftItem` | `{ itemName: string, count: number }` | Locates recipes, uses nearby crafting tables if required, and crafts items. |
| `placeBlock` | `{ blockName: string, x: number, y: number, z: number }` | Places a block from inventory onto target coordinates. |
| `sendChatMessage` | `{ message: string, targetPlayer?: string }` | Sends public in-game chat or private whispers (`/msg`). |
| `inspectInventory` | `{}` | Returns structured JSON of current items, equipment, and durability. |
| `interactContainer` | `{ action: "deposit"\|"withdraw", chestX: number, chestY: number, chestZ: number, items: Array }` | Interacts with chest windows. |
| `broadcastToSwarm` | `{ message: string, taskType: string }` | Sends inter-bot communication across the local agent swarm bus. |

---

## 4. Multi-Agent Coordination Protocol

To allow bots to work together on collective tasks (e.g., "Build a wooden house" or "Clear a mine shaft"):

1. **Shared Task Queue / Blackboard Pattern:**
   * A shared memory bus (Redis or In-Memory Event Emitter) maintains active team goals.
   * Bots claim sub-tasks via tool calls (`claimTask({ taskId: "gather_wood" })`) to prevent duplicate work.
2. **Inter-Bot Communication:**
   * **In-Game Direct Chat:** Bots read chat messages from other bots containing specialized tags (e.g., `[SWARM_BROADCAST] Need 20 Cobblestone`).
   * **Sideband Agent Bus:** Low-latency socket communication for exchanging target vectors, spatial hazards, and inventory states without cluttering public chat.
3. **Role Assignments:**
   * Bots can be initialized with system prompts assigning roles:
     * **Gatherer:** Specialized in resource harvesting.
     * **Builder:** Specialized in placement and schematics.
     * **Guard:** Equipped with weapons, monitors hostile mobs using `mineflayer-pvp`.

---

## 5. Technology Stack & Project Structure

* **Runtime:** Node.js (v18+ LTS)
* **Language:** JavaScript
* **Core Libraries:** `mineflayer`, `mineflayer-pathfinder`, `vec3`, `@langchain/core` (or OpenAI SDK)
* **LLM Engine:** OpenAI API (such as `GPT 5.5`), Ollama (Local LLMs like `ministral3`), or any other OpenAI-compatible endpoint.
* **Database:** Quick.DB/BetterSQLite

### File Directory Layout
```text
mineflayer-ai-swarm/
├── config/
│   └── bots.json              # List of bots, server host, port, LLM models
├── src/
│   ├── config.js              # Config loader & environment variables
│   ├── index.js               # Entry point: initializes bot orchestrator
│   ├── orchestrator/
│   │   ├── BotManager.js      # Lifecycle management (spawn, reconnect)
│   │   └── SharedMemory.js    # Swarm state, task allocation engine
│   ├── agent/
│   │   ├── BotAgent.js        # Main ReAct loop for a single bot
│   │   ├── ContextBuilder.js # Constructs spatial context & memory prompt
│   │   └── LLMProvider.js    # Interface for OpenAI / Ollama
│   ├── tools/
│   │   ├── index.js           # Tool registry & schema builder
│   │   ├── movementTools.js   # Pathfinder wrapper methods
│   │   ├── miningTools.js     # Mineflayer-collectblock wrapper methods
│   │   ├── inventoryTools.js  # Inventory & crafting wrapper methods
│   │   └── swarmTools.js      # Inter-bot signaling methods
│   └── types/
│       └── index.js           # JavaScript type definitions
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 6. Implementation Reference Code

### 6.1 `config/bots.json`
```json
{
  "server": {
    "host": "127.0.0.1",
    "port": 25565,
    "version": "1.20.1"
  },
  "bots": [
    { "username": "Worker_Alpha", "role": "Gatherer" },
    { "username": "Worker_Beta", "role": "Builder" },
    { "username": "Guard_One", "role": "Defender" }
  ]
}
```

### 6.2 Primary Agent Loop (`src/agent/BotAgent.js` - rough draft in TypeScript)
```typescript
import mineflayer from 'mineflayer';
import { pathfinder, Movements } from 'mineflayer-pathfinder';
import autoeat from 'mineflayer-auto-eat';
import { toolRegistry, executeTool } from '../tools/index';
import { LLMClient } from './LLMProvider';

export class BotAgent {
  public bot: mineflayer.Bot;
  private llm: LLMClient;
  private role: string;
  private isProcessing: boolean = false;

  constructor(username: string, host: string, port: number, version: string, role: string) {
    this.role = role;
    this.llm = new LLMClient();

    // 1. Initialize Mineflayer with Offline Auth Mode
    this.bot = mineflayer.createBot({
      host: host,
      port: port,
      username: username,
      auth: 'offline', // Required for offline mode servers
      version: version
    });

    this.setupPlugins();
    this.setupEvents();
  }

  private setupPlugins() {
    this.bot.loadPlugin(pathfinder);
    this.bot.loadPlugin(autoeat);
  }

  private setupEvents() {
    this.bot.once('spawn', () => {
      console.log(`[${this.bot.username}] Spawned in offline server.`);
      const mcData = require('minecraft-data')(this.bot.version);
      const defaultMove = new Movements(this.bot, mcData);
      this.bot.pathfinder.setMovements(defaultMove);

      // Trigger initial reasoning loop on spawn
      this.runAgentLoop("You have just spawned. Inspect your surroundings and coordinate with the team.");
    });

    // Listen to chat for user commands or swarm communications
    this.bot.on('chat', async (username, message) => {
      if (username === this.bot.username) return;

      const prompt = `Player/Bot '${username}' said: "${message}". Decide if you need to act or reply.`;
      await this.runAgentLoop(prompt);
    });

    this.bot.on('error', (err) => console.error(`[${this.bot.username}] Error:`, err));
  }

  public async runAgentLoop(userInstruction: string) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Build environmental context summary
      const context = this.buildEnvironmentContext(userInstruction);

      // 2. Call LLM with registered function schemas
      const response = await this.llm.generateDecision({
        systemPrompt: `You are a Minecraft bot named ${this.bot.username}. Your assigned role is: ${this.role}. Work together with other bots to complete goals.`,
        contextPrompt: context,
        tools: toolRegistry
      });

      // 3. Handle LLM tool executions
      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          console.log(`[${this.bot.username}] Executing Tool: ${toolCall.name}`);
          const result = await executeTool(this.bot, toolCall.name, toolCall.args);

          // Feed result back into follow-up reasoning step if necessary
          if (result.success && result.feedback) {
            this.bot.chat(result.feedback);
          }
        }
      } else if (response.textResponse) {
        this.bot.chat(response.textResponse);
      }
    } catch (err) {
      console.error(`[${this.bot.username}] Agent Loop Error:`, err);
    } finally {
      this.isProcessing = false;
    }
  }

  private buildEnvironmentContext(trigger: string): string {
    const pos = this.bot.entity?.position;
    const health = this.bot.health;
    const food = this.bot.food;
    const nearbyEntities = Object.keys(this.bot.entities)
      .map(id => this.bot.entities[id])
      .filter(e => e && e.type === 'mob' && e.position.distanceTo(pos) < 15)
      .map(e => e.name);

    return `
Trigger: ${trigger}
Status: Health=${health}/20, Food=${food}/20
Position: X=${pos?.x.toFixed(1)}, Y=${pos?.y.toFixed(1)}, Z=${pos?.z.toFixed(1)}
Nearby Mobs (15m): ${nearbyEntities.join(', ') || 'None'}
Inventory Summary: ${this.bot.inventory.items().map(i => `${i.name}x${i.count}`).join(', ')}
`;
  }
}
```

---

## 7. Operational & Safety Boundaries

1. **Recursion & Rate Limiting:** The agent loop must enforce a maximum execution depth per trigger to prevent infinite LLM tool invocation loops.
2. **Server Anti-Cheat & Offline Safety:**
   * Disable unnatural packet movement speeds in `mineflayer-pathfinder`.
   * Ensure offline account names do not conflict with online UUID formats or existing admin handles on the target server.
3. **Failure Recovery:** If a tool call fails (e.g., `mineBlock` targeted an air block or un-reachable location), the error must be wrapped gracefully and returned to the LLM context so it can formulate an alternative strategy.