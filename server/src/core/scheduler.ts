import { EventEmitter } from 'node:events';
import { nanoid } from 'nanoid';
import type { Task, PersistAdapter } from './types.js';
import { nextFromParse, parseHuman } from './parser.js';

export interface SchedulerOptions {
  persist?: PersistAdapter;
  tickMs?: number; // resolução do loop
}

export class Scheduler extends EventEmitter {
  private tasks: Task[] = [];
  private timer?: NodeJS.Timeout;
  private tickMs: number;

  constructor(private opts: SchedulerOptions = {}) {
    super();
    this.tickMs = opts.tickMs ?? 500;
  }

  async init() {
    if (this.opts.persist) {
      this.tasks = await this.opts.persist.load();
    }
    this.loop();
  }

  list() {
    return [...this.tasks];
  }

  async add(label: string, humanWhen: string, payload?: Record<string, unknown>) {
    const parsed = parseHuman(humanWhen);
    const nextAt = nextFromParse(parsed);
    const frequency = toFrequency(parsed, nextAt);
    const t: Task = {
      id: nanoid(),
      label,
      frequency,
      payload,
      enabled: true,
      createdAt: new Date()
    };
    this.tasks.push(t);
    await this.persist();
    return t;
  }

  async remove(id: string) {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    await this.persist();
  }

  async toggle(id: string, enabled: boolean) {
    const t = this.tasks.find((x) => x.id === id);
    if (t) {
      t.enabled = enabled;
      await this.persist();
    }
  }

  private loop() {
    this.timer = setInterval(async () => {
      const now = Date.now();
      for (const t of this.tasks) {
        if (!t.enabled) continue;
        const nextAt = getNextAt(t);
        if (nextAt && nextAt.getTime() <= now) {
          t.lastRunAt = new Date();
          this.emit('run', { task: t });
          bumpNext(t);
          await this.persist();
        }
      }
    }, this.tickMs);
  }

  private async persist() {
    if (this.opts.persist) await this.opts.persist.save(this.tasks);
  }
}

function toFrequency(parsed: ReturnType<typeof parseHuman>, nextAt: Date): Task['frequency'] {
  switch (parsed.kind) {
    case 'in':
      return { kind: 'interval', everyMs: parsed.ms, nextAt };
    case 'at':
      return { kind: 'once', at: nextAt };
    case 'daily':
      return { kind: 'daily', hour: parsed.hour, minute: parsed.minute, nextAt };
    case 'weekly':
      return { kind: 'weekly', dow: parsed.dow, hour: parsed.hour, minute: parsed.minute, nextAt };
  }
}

function getNextAt(t: Task): Date | undefined {
  switch (t.frequency.kind) {
    case 'once':
      return t.frequency.at;
    case 'interval':
    case 'daily':
    case 'weekly':
      return t.frequency.nextAt;
  }
}

function bumpNext(t: Task) {
  const f = t.frequency;
  const base = f.kind === 'once' ? null : f.nextAt;
  switch (f.kind) {
    case 'once':
      t.enabled = false;
      break;
    case 'interval':
      f.nextAt = new Date((base ?? new Date()).getTime() + f.everyMs);
      break;
    case 'daily': {
      const d = new Date(base ?? new Date());
      d.setDate(d.getDate() + 1);
      f.nextAt = new Date(d.setHours(f.hour, f.minute, 0, 0));
      break;
    }
    case 'weekly': {
      const d = new Date(base ?? new Date());
      d.setDate(d.getDate() + 7);
      f.nextAt = new Date(d.setHours(f.hour, f.minute, 0, 0));
      break;
    }
  }
}
