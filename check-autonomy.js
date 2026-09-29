import assert from 'node:assert/strict';
import { loadConfig } from './src/config.js';

const config = await loadConfig();

assert.ok(typeof config.agent.autonomousIntervalMs === 'number', 'autonomousIntervalMs missing');
assert.ok(config.agent.autonomousIntervalMs >= 1000, 'autonomousIntervalMs must be >= 1000');

console.log('Autonomy config assertion passed.');
