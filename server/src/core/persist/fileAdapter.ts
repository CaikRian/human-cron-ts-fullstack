import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { PersistAdapter, Task } from '../types.js';

export class FileAdapter implements PersistAdapter {
  constructor(private path = './.human-cron.json') {}

  async load(): Promise<Task[]> {
    try {
      const raw = await fs.readFile(this.path, 'utf-8');
      const parsed = JSON.parse(raw) as Task[];
      return parsed.map((t) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        lastRunAt: t.lastRunAt ? new Date(t.lastRunAt) : undefined,
        frequency: reviveFrequency(t.frequency)
      }));
    } catch {
      return [];
    }
  }

  async save(tasks: Task[]): Promise<void> {
    await fs.mkdir(dirname(this.path), { recursive: true });
    await fs.writeFile(this.path, JSON.stringify(tasks, null, 2), 'utf-8');
  }
}

function reviveFrequency(f: Task['frequency']): Task['frequency'] {
  switch (f.kind) {
    case 'once':
      return { kind: 'once', at: new Date((f as any).at) };
    case 'interval':
      return { kind: 'interval', everyMs: (f as any).everyMs, nextAt: new Date((f as any).nextAt) };
    case 'daily':
      return {
        kind: 'daily',
        hour: (f as any).hour,
        minute: (f as any).minute,
        nextAt: new Date((f as any).nextAt)
      };
    case 'weekly':
      return {
        kind: 'weekly',
        dow: (f as any).dow,
        hour: (f as any).hour,
        minute: (f as any).minute,
        nextAt: new Date((f as any).nextAt)
      };
  }
}
