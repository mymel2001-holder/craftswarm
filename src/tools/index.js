import pathfinderPackage from 'mineflayer-pathfinder';
import { Vec3 } from 'vec3';

const { goals } = pathfinderPackage;
const schema = (name, description, properties, required = Object.keys(properties)) => ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required, additionalProperties: false } } });
const coord = { type: 'number' };

export const tools = [
  schema('goToLocation', 'Navigate safely to coordinates.', { x: coord, y: coord, z: coord }),
  schema('followPlayer', 'Follow an online player continuously.', { playerName: { type: 'string' } }),
  schema('mineBlock', 'Mine reachable blocks by Minecraft block name.', { blockName: { type: 'string' }, count: { type: 'integer', minimum: 1, maximum: 64 } }),
  schema('craftItem', 'Craft an item from known recipe.', { itemName: { type: 'string' }, count: { type: 'integer', minimum: 1, maximum: 64 } }),
  schema('placeBlock', 'Place inventory block at coordinates.', { blockName: { type: 'string' }, x: coord, y: coord, z: coord }),
  schema('sendChatMessage', 'Send public chat or private message.', { message: { type: 'string', maxLength: 200 }, targetPlayer: { type: 'string' } }, ['message']),
  schema('inspectInventory', 'Return inventory contents.', {}, []),
  schema('broadcastToSwarm', 'Send sideband swarm message.', { message: { type: 'string' }, taskType: { type: 'string' } }),
  schema('claimTask', 'Claim open swarm task.', { taskId: { type: 'string' } })
];

export async function executeTool({ bot, memory, username }, name, args) {
  const mcData = bot.registry;
  const itemByName = (itemName) => mcData.itemsByName[itemName];
  if (name === 'goToLocation') { await bot.pathfinder.goto(new goals.GoalBlock(args.x, args.y, args.z)); return `Arrived at ${args.x}, ${args.y}, ${args.z}.`; }
  if (name === 'followPlayer') { const target = bot.players[args.playerName]?.entity; if (!target) throw new Error(`Player not visible: ${args.playerName}`); bot.pathfinder.setGoal(new goals.GoalFollow(target, 2), true); return `Following ${args.playerName}.`; }
  if (name === 'mineBlock') { const block = mcData.blocksByName[args.blockName]; if (!block) throw new Error(`Unknown block: ${args.blockName}`); const found = bot.findBlocks({ matching: block.id, maxDistance: 64, count: args.count }).map((p) => bot.blockAt(p)).filter(Boolean); if (!found.length) throw new Error(`No reachable ${args.blockName}.`); await bot.collectBlock.collect(found); return `Mined ${found.length} ${args.blockName}.`; }
  if (name === 'craftItem') { const item = itemByName(args.itemName); if (!item) throw new Error(`Unknown item: ${args.itemName}`); const recipe = bot.recipesFor(item.id, null, args.count, null)[0]; if (!recipe) throw new Error(`No craftable recipe for ${args.itemName}.`); await bot.craft(recipe, args.count, null); return `Crafted ${args.count} ${args.itemName}.`; }
  if (name === 'placeBlock') { const item = itemByName(args.blockName); const stack = bot.inventory.items().find((entry) => entry.type === item?.id); if (!stack) throw new Error(`Missing ${args.blockName}.`); const target = new Vec3(args.x, args.y, args.z); const reference = bot.blockAt(target.offset(0, -1, 0)); if (!reference) throw new Error('No placement support block.'); await bot.equip(stack, 'hand'); await bot.placeBlock(reference, new Vec3(0, 1, 0)); return `Placed ${args.blockName}.`; }
  if (name === 'sendChatMessage') { bot.chat(args.targetPlayer ? `/msg ${args.targetPlayer} ${args.message}` : args.message); return 'Message sent.'; }
  if (name === 'inspectInventory') return JSON.stringify(bot.inventory.items().map(({ name: itemName, count, durabilityUsed }) => ({ name: itemName, count, durabilityUsed })));
  if (name === 'broadcastToSwarm') { memory.broadcast({ from: username, ...args }); return 'Broadcast delivered.'; }
  if (name === 'claimTask') return JSON.stringify(memory.claimTask(args.taskId, username));
  throw new Error(`Unknown tool: ${name}`);
}
