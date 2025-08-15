# Human Cron TS — Full‑Stack

Um projeto completo para portfólio com:
- **API HTTP (Express + TypeScript)** para gerenciar tarefas;
- **Core** de agendamento em TS (parser de linguagem natural em pt‑BR, recorrência, persistência em JSON);
- **Dashboard React (Vite + TS)** para listar, criar, pausar e excluir tarefas, com **SSE** para eventos em tempo real.

## Como rodar (local)

### 1) API
```bash
cd server
npm i
npm run dev
# a API subirá em http://localhost:4000
```

### 2) Front-end
Abra outro terminal:
```bash
cd web
npm i
npm run dev
# a UI abrirá em http://localhost:5173 (proxy para /api -> 4000)
```

## Scripts úteis
- **server**: `npm run dev` (hot-reload via tsx), `npm run build`, `npm start`
- **web**: `npm run dev`, `npm run build`, `npm run preview`

## Endpoints principais (API)
- `GET /api/health` — status da API
- `GET /api/tasks` — lista tarefas
- `POST /api/tasks` — cria tarefa `{ label, when, payload? }`
- `PATCH /api/tasks/:id` — altera estado `{ enabled }`
- `DELETE /api/tasks/:id` — remove tarefa
- `GET /api/events` — SSE com eventos de execução

## Estrutura
```
server/
  src/
    core/ (scheduler, parser, tipos, persistência)
    index.ts (Express API)
web/
  src/
    App.tsx (UI)
    main.tsx
  vite.config.ts
```

> Dica: Commits pequenos e uma boa descrição no README (capturas da UI) valorizam seu portfólio.
