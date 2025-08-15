import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { Scheduler } from './core/scheduler.js';
import { FileAdapter } from './core/persist/fileAdapter.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Scheduler + persistência em disco
const sched = new Scheduler({ persist: new FileAdapter('./data/tasks.json') });

// memória simples de logs + SSE
type Client = { id: number; res: express.Response };
let clients: Client[] = [];
let clientSeq = 0;

function broadcast(data: any) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) {
    c.res.write(payload);
  }
}

sched.on('run', ({ task }) => {
  console.log(`[RUN]`, task.label);
  broadcast({ type: 'run', task: publicTask(task) });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/tasks', (_req, res) => {
  res.json(sched.list().map(publicTask));
});

const CreateTask = z.object({
  label: z.string().min(1),
  when: z.string().min(1),
  payload: z.record(z.any()).optional()
});
app.post('/api/tasks', async (req, res) => {
  const parsed = CreateTask.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const { label, when, payload } = parsed.data;
  const t = await sched.add(label, when, payload);
  res.status(201).json(publicTask(t));
});

const PatchTask = z.object({ enabled: z.boolean() });
app.patch('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const parsed = PatchTask.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  await sched.toggle(id, parsed.data.enabled);
  res.json({ ok: true });
});

app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  await sched.remove(id);
  res.status(204).end();
});

// Server-Sent Events
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  const id = clientSeq++;
  clients.push({ id, res });
  req.on('close', () => {
    clients = clients.filter(c => c.id != id);
  });
  res.write(`data: ${JSON.stringify({ type: 'hello', id })}\n\n`);
});

function publicTask(t: any) {
  return {
    id: t.id,
    label: t.label,
    enabled: t.enabled,
    payload: t.payload ?? null,
    createdAt: t.createdAt,
    lastRunAt: t.lastRunAt ?? null,
    frequency: t.frequency
  };
}

async function main() {
  await sched.init();
  app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
}
main();
