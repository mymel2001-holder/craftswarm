import assert from 'node:assert/strict';
import { loadConfig } from './src/config.js';

const config = await loadConfig();

assert.ok(typeof config.agent.autonomousIntervalMs === 'number', 'autonomousIntervalMs missing');
assert.ok(config.agent.autonomousIntervalMs >= 1000, 'autonomousIntervalMs must be >= 1000');
assert.ok(Number.isInteger(config.agent.maxToolRounds) && config.agent.maxToolRounds >= 1, 'maxToolRounds must be a positive integer');

console.log('Autonomy config assertion passed.');
