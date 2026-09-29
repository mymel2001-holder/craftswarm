export function buildContext(bot, trigger, memory) {
  const position = bot.entity?.position;
  const nearbyMobs = Object.values(bot.entities)
    .filter((entity) => entity?.type === 'mob' && position && entity.position.distanceTo(position) < 15)
    .map((entity) => entity.name || entity.displayName)
    .join(', ') || 'none';

  return [
    `Trigger: ${trigger}`,
    `Status: health=${bot.health}/20 food=${bot.food}/20`,
    `Position: ${position ? `${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}` : 'unknown'}`,
    `Nearby mobs: ${nearbyMobs}`,
    `Inventory: ${bot.inventory.items().map((item) => `${item.name} x${item.count}`).join(', ') || 'empty'}`,
    `Open tasks: ${[...memory.tasks.values()].filter((task) => task.status === 'open').map((task) => `${task.id}: ${task.description}`).join('; ') || 'none'}`,
    `Recent swarm messages: ${memory.messages.slice(-5).map((entry) => `${entry.from}: ${entry.message}`).join(' | ') || 'none'}`
  ].join('\n');
}
