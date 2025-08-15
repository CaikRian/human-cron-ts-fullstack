import {
  addMinutes,
  addSeconds,
  nextDay,
  nextFriday,
  nextMonday,
  nextSaturday,
  nextSunday,
  nextThursday,
  nextTuesday,
  nextWednesday,
  set
} from 'date-fns';

const dowMap: Record<string, number> = {
  domingo: 0, dom: 0,
  segunda: 1, 'segunda-feira': 1, seg: 1,
  terca: 2, 'terça': 2, 'terça-feira': 2, ter: 2,
  quarta: 3, 'quarta-feira': 3, qua: 3,
  quinta: 4, 'quinta-feira': 4, qui: 4,
  sexta: 5, 'sexta-feira': 5, sex: 5,
  sabado: 6, 'sábado': 6, sab: 6
};

export type ParseResult =
  | { kind: 'in'; ms: number }
  | { kind: 'at'; date: Date }
  | { kind: 'daily'; hour: number; minute: number }
  | { kind: 'weekly'; dow: number; hour: number; minute: number };

export function parseHuman(text: string, now = new Date()): ParseResult {
  const s = text.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

  // em X minutos/segundos
  const inMin = s.match(/em\s+(\d+)\s+min(uto)?s?/);
  if (inMin) return { kind: 'in', ms: Number(inMin[1]) * 60_000 };

  const inSec = s.match(/em\s+(\d+)\s+s(egundo)?s?/);
  if (inSec) return { kind: 'in', ms: Number(inSec[1]) * 1000 };

  // amanhã às HH:mm
  const tomorrow = s.match(/amanha\s*(as|às)?\s*(\d{1,2})(?::(\d{2}))?/);
  if (tomorrow) {
    const hour = Number(tomorrow[2]);
    const minute = Number(tomorrow[3] ?? '0');
    const d = addMinutes(set(now, { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 }), 24 * 60);
    return { kind: 'at', date: d };
  }

  // toda segunda às 14:30
  const weekly = s.match(/toda?\s+([a-z\u00C0-\u017F]+)\s*(as|às)?\s*(\d{1,2})(?::(\d{2}))?/);
  if (weekly) {
    const dowName = weekly[1];
    const dow = dowMap[dowName];
    if (dow !== undefined) {
      return { kind: 'weekly', dow, hour: Number(weekly[3]), minute: Number(weekly[4] ?? '0') };
    }
  }

  // diariamente às 09:00 | todo dia às 09:00
  const daily = s.match(/(diariamente|todo\s+dia)\s*(as|às)?\s*(\d{1,2})(?::(\d{2}))?/);
  if (daily) {
    return { kind: 'daily', hour: Number(daily[3]), minute: Number(daily[4] ?? '0') };
  }

  // às HH:mm hoje (se horário futuro) senão amanhã
  const at = s.match(/(as|às)\s*(\d{1,2})(?::(\d{2}))?/);
  if (at) {
    const hour = Number(at[2]);
    const minute = Number(at[3] ?? '0');
    const candidate = set(now, { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 });
    return { kind: 'at', date: candidate > now ? candidate : addMinutes(candidate, 24 * 60) };
  }

  // fallback: 10 segundos
  return { kind: 'in', ms: 10_000 };
}

// calcula o próximo disparo a partir de now
export function nextFromParse(p: ParseResult, now = new Date()): Date {
  switch (p.kind) {
    case 'in':
      return addSeconds(now, p.ms / 1000);
    case 'at':
      return p.date;
    case 'daily': {
      const today = set(now, { hours: p.hour, minutes: p.minute, seconds: 0, milliseconds: 0 });
      return today > now ? today : addMinutes(today, 24 * 60);
    }
    case 'weekly': {
      const setTime = (d: Date) => set(d, { hours: p.hour, minutes: p.minute, seconds: 0, milliseconds: 0 });
      const funcs = [nextSunday, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday];
      return setTime(funcs[p.dow](now));
    }
  }
}
