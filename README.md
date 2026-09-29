# CraftSwarm

LLM-driven Mineflayer bot swarm for offline-mode Minecraft servers.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` for OpenAI-compatible provider. Ollama default works at `http://127.0.0.1:11434/v1`.
3. Edit `config/bots.json` for server and bot roles.
4. Run:

```cmd
npm install
npm start
```

Minecraft server must permit offline clients. Bots use `auth: 'offline'`.

## Included behavior

- Dynamic configured bot spawn, exponential reconnect on disconnect.
- ReAct tool-call rounds with strict maximum from `AGENT_MAX_TOOL_ROUNDS`.
- OpenAI-compatible function schemas for navigation, follow, mining, crafting, placement, chat, inventory, task claims, swarm broadcasts.
- Mineflayer pathfinding, collection, auto-eat, and PvP plugins.
- In-process shared task/message blackboard.

## Commands

```cmd
npm run check
npm start
```

`mineBlock` needs reachable blocks. `craftItem` currently crafts without selecting a crafting table; add table lookup when recipes need one.
