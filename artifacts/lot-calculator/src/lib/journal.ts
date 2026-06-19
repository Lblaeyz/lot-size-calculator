export interface TradeEntry {
  id: string;
  date: string;
  pair: string;
  direction: "buy" | "sell";
  lotSize: number;
  slPips: number;
  tpPips: number | null;
  riskUSD: number;
  riskNGN: number;
  rr: string | null;
  outcome: "win" | "loss" | "breakeven" | null;
  pnlUSD: number | null;
  pnlNGN: number | null;
  notes: string;
  usdRate: number;
}

const KEY = "lotcalc_journal";

export function getEntries(): TradeEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveEntry(entry: TradeEntry): void {
  const entries = getEntries();
  entries.unshift(entry);
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function updateEntry(id: string, patch: Partial<TradeEntry>): void {
  const entries = getEntries();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx !== -1) {
    entries[idx] = { ...entries[idx], ...patch };
    localStorage.setItem(KEY, JSON.stringify(entries));
  }
}

export function deleteEntry(id: string): void {
  const entries = getEntries().filter((e) => e.id !== id);
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function getStats(entries: TradeEntry[]) {
  const closed = entries.filter((e) => e.outcome !== null);
  const wins = closed.filter((e) => e.outcome === "win");
  const losses = closed.filter((e) => e.outcome === "loss");
  const totalPnlUSD = closed.reduce((s, e) => s + (e.pnlUSD ?? 0), 0);
  const totalPnlNGN = closed.reduce((s, e) => s + (e.pnlNGN ?? 0), 0);
  const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
  return { closed: closed.length, wins: wins.length, losses: losses.length, totalPnlUSD, totalPnlNGN, winRate };
}
