import React, { useEffect, useMemo, useState } from 'react';

type Task = {
  id: string;
  label: string;
  enabled: boolean;
  payload: Record<string, any> | null;
  createdAt: string;
  lastRunAt: string | null;
  frequency: any;
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [label, setLabel] = useState('');
  const [when, setWhen] = useState('em 10 segundos');
  const [payload, setPayload] = useState('{}');
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const res = await fetch('/api/tasks');
    const data = await res.json();
    setTasks(data);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const ev = new EventSource('/api/events');
    ev.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.type === 'run') {
          setLog((l) => [`Rodou: ${data.task.label} @ ${new Date().toLocaleTimeString()}`, ...l]);
          refresh();
        }
      } catch {}
    };
    return () => ev.close();
  }, []);

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    let body: any = { label, when };
    try {
      const parsed = JSON.parse(payload);
      if (parsed && typeof parsed === 'object') body.payload = parsed;
    } catch {}
    const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      setLabel('');
      setWhen('em 10 segundos');
      setPayload('{}');
      refresh();
    } else {
      const err = await res.json().catch(() => ({}));
      alert('Erro ao criar: ' + (err.error ? JSON.stringify(err.error) : res.status));
    }
  };

  const toggle = async (t: Task) => {
    await fetch(`/api/tasks/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !t.enabled })
    });
    refresh();
  };

  const remove = async (t: Task) => {
    await fetch(`/api/tasks/${t.id}`, { method: 'DELETE' });
    refresh();
  };

  const prettyJson = (obj: any) => JSON.stringify(obj, null, 2);

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto', color: '#e6eaf2', background: 'radial-gradient(1200px 800px at 10% 10%, #0b0f18 0%, #0b0f18 30%, #06080f 100%)', minHeight: '100vh', padding: 24 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Human Cron TS — Dashboard</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>Agende tarefas com linguagem natural (pt‑BR): “em 5 minutos”, “amanhã às 09:30”, “diariamente às 09:00”, “toda segunda às 14:30”.</p>

      <form onSubmit={createTask} style={{ display: 'grid', gap: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.20)', padding: 16, borderRadius: 16, marginBottom: 24 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label>Nome da tarefa</label>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex.: Enviar relatório" required style={inputStyle} />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label>Quando</label>
          <input value={when} onChange={e => setWhen(e.target.value)} placeholder="Ex.: diariamente às 09:00" required style={inputStyle} />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label>Payload (JSON opcional)</label>
          <textarea value={payload} onChange={e => setPayload(e.target.value)} rows={4} style={{ ...inputStyle, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }} />
        </div>
        <div>
          <button type="submit" style={btnPrimary}>Criar tarefa</button>
        </div>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section style={cardStyle}>
          <h2 style={h2}>Tarefas {loading && <small style={{ opacity: .6 }}>(carregando...)</small>}</h2>
          {tasks.length === 0 && <p style={{ opacity: .7 }}>Nenhuma tarefa criada ainda.</p>}
          <div style={{ display: 'grid', gap: 8 }}>
            {tasks.map((t) => (
              <div key={t.id} style={{ ...rowStyle, opacity: t.enabled ? 1 : .6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{t.label}</div>
                  <div style={{ fontSize: 12, opacity: .8 }}>
                    {t.frequency.kind === 'once' && 'Única'}
                    {t.frequency.kind === 'interval' && `A cada ${t.frequency.everyMs/1000}s`}
                    {t.frequency.kind === 'daily' && `Diária ${String(t.frequency.hour).padStart(2,'0')}:${String(t.frequency.minute).padStart(2,'0')}`}
                    {t.frequency.kind === 'weekly' && `Semanal (DOW=${t.frequency.dow}) ${String(t.frequency.hour).padStart(2,'0')}:${String(t.frequency.minute).padStart(2,'0')}`}
                  </div>
                </div>
                <button onClick={() => toggle(t)} style={btnGhost}>{t.enabled ? 'Pausar' : 'Ativar'}</button>
                <button onClick={() => remove(t)} style={btnDanger}>Excluir</button>
              </div>
            ))}
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={h2}>Eventos</h2>
          <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', fontSize: 12, lineHeight: 1.5, maxHeight: 280, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </section>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.2)',
  padding: '10px 12px',
  borderRadius: 12,
  color: '#e6eaf2',
  outline: 'none'
};

const btnPrimary: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.2)',
  background: '#8ab4ff',
  color: '#0b0f18',
  cursor: 'pointer',
  fontWeight: 700
};

const btnGhost: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'transparent',
  color: '#e6eaf2',
  cursor: 'pointer',
  marginRight: 8
};

const btnDanger: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.2)',
  background: '#ff8a8a',
  color: '#0b0f18',
  cursor: 'pointer'
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.20)',
  padding: 16,
  borderRadius: 16,
  minHeight: 200
};

const h2: React.CSSProperties = { fontSize: 18, marginTop: 0 };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: 8, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12 };
