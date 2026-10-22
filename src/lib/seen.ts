const KEY = "radar.seen";
const LIMIT = 2000;

function read(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

export function getSeen(): Set<number> {
  return new Set(read());
}

export function markSeen(id: number) {
  try {
    const list = read();
    if (list.includes(id)) return;
    list.push(id);
    const trimmed = list.length > LIMIT ? list.slice(list.length - LIMIT) : list;
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // storage unavailable — the feed still works, just without cross-session memory
  }
}
