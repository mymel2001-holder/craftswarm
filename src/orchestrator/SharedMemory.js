import { EventEmitter } from 'node:events';

export class SharedMemory extends EventEmitter {
  constructor() {
    super();
    this.tasks = new Map();
    this.messages = [];
  }

  addTask({ id, description, type = 'general' }) {
    if (this.tasks.has(id)) throw new Error(`Task already exists: ${id}`);
    const task = { id, description, type, status: 'open', claimedBy: null };
    this.tasks.set(id, task);
    this.emit('task', task);
    return task;
  }

  claimTask(id, username) {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Unknown task: ${id}`);
    if (task.status !== 'open') return { ...task, claimed: false };
    task.status = 'claimed';
    task.claimedBy = username;
    this.emit('task', task);
    return { ...task, claimed: true };
  }

  broadcast({ from, message, taskType = 'general' }) {
    const entry = { from, message, taskType, at: new Date().toISOString() };
    this.messages.push(entry);
    this.messages.splice(0, this.messages.length - 100);
    this.emit('broadcast', entry);
    return entry;
  }
}
