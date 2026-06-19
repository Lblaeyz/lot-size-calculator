import { useState, useEffect } from "react";
import { Trash2, Edit3, CheckCircle, XCircle, MinusCircle, TrendingUp, TrendingDown } from "lucide-react";
import { getEntries, deleteEntry, updateEntry, getStats, TradeEntry } from "@/lib/journal";
import { useToast } from "@/hooks/use-toast";

function fmt(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface CloseModalProps {
  entry: TradeEntry;
  onClose: () => void;
  onSave: () => void;
}

function CloseModal({ entry, onClose, onSave }: CloseModalProps) {
  const { toast } = useToast();
  const [outcome, setOutcome] = useState<"win" | "loss" | "breakeven">("win");
  const [pnlUSD, setPnlUSD] = useState("");
  const [notes, setNotes] = useState(entry.notes);

  const save = () => {
    const pnl = parseFloat(pnlUSD);
    updateEntry(entry.id, {
      outcome,
      pnlUSD: isNaN(pnl) ? null : (outcome === "loss" ? -Math.abs(pnl) : Math.abs(pnl)),
      pnlNGN: isNaN(pnl) ? null : (outcome === "loss" ? -Math.abs(pnl) : Math.abs(pnl)) * entry.usdRate,
      notes,
    });
    toast({ title: "Trade closed", description: `${entry.pair} marked as ${outcome}` });
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-3" onClick={onClose}>
      <div
        className="w-full max-w-[480px] bg-card border border-border rounded-2xl p-4 animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[11px] text-primary font-semibold font-mono mb-3">Close Trade: {entry.pair} {entry.direction.toUpperCase()}</div>

        <div className="mb-3">
          <div className="text-[11px] text-muted-foreground font-mono uppercase tracking-wide mb-1.5">Outcome</div>
          <div className="flex gap-2">
            {(["win", "loss", "breakeven"] as const).map((o) => (
              <button
                key={o}
                data-testid={`btn-outcome-${o}`}
                onClick={() => setOutcome(o)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  outcome === o
                    ? o === "win"
                      ? "bg-green-500/20 border-green-500 text-green-400"
                      : o === "loss"
                      ? "bg-red-500/20 border-red-500 text-red-400"
                      : "bg-yellow-500/20 border-yellow-500 text-yellow-400"
                    : "bg-background border-border text-muted-foreground"
                }`}
              >
                {o === "win" ? "✅ Win" : o === "loss" ? "❌ Loss" : "➖ B/E"}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <div className="text-[11px] text-muted-foreground font-mono uppercase tracking-wide mb-1.5">P&L (USD)</div>
          <input
            data-testid="input-pnl-usd"
            type="number"
            step="any"
            placeholder="e.g. 120.50"
            value={pnlUSD}
            onChange={(e) => setPnlUSD(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
          />
          {pnlUSD && !isNaN(parseFloat(pnlUSD)) && (
            <div className="text-[11px] text-muted-foreground font-mono mt-1">
              ≈ ₦{fmt((Math.abs(parseFloat(pnlUSD)) * entry.usdRate).toFixed(0))}
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="text-[11px] text-muted-foreground font-mono uppercase tracking-wide mb-1.5">Notes</div>
          <textarea
            data-testid="input-notes"
            placeholder="What happened? Any observations..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            data-testid="btn-cancel-close"
            onClick={onClose}
            className="flex-1 bg-secondary border border-border text-muted-foreground rounded-lg py-2.5 text-sm transition-colors hover:text-foreground"
          >
            Cancel
          </button>
          <button
            data-testid="btn-save-close"
            onClick={save}
            className="flex-1 bg-primary text-white rounded-lg py-2.5 text-sm font-semibold transition-colors hover:bg-primary/90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Journal() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<TradeEntry[]>([]);
  const [closeTarget, setCloseTarget] = useState<TradeEntry | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "win" | "loss">("all");

  const refresh = () => setEntries(getEntries());

  useEffect(() => { refresh(); }, []);

  const stats = getStats(entries);

  const filtered = entries.filter((e) => {
    if (filter === "open") return e.outcome === null;
    if (filter === "win") return e.outcome === "win";
    if (filter === "loss") return e.outcome === "loss";
    return true;
  });

  const remove = (id: string) => {
    deleteEntry(id);
    refresh();
    toast({ title: "Trade removed" });
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="text-4xl mb-3">📒</div>
        <div className="text-sm font-semibold text-foreground mb-1">No trades logged yet</div>
        <div className="text-xs text-muted-foreground">
          Calculate a trade and tap <span className="text-primary">"Log Trade"</span> to record it here
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} color="text-green-400" />
        <StatCard label="Total P&L" value={`$${stats.totalPnlUSD >= 0 ? "" : ""}${stats.totalPnlUSD.toFixed(0)}`} color={stats.totalPnlUSD >= 0 ? "text-green-400" : "text-red-400"} />
        <StatCard label="Trades" value={`${stats.wins}W / ${stats.losses}L`} color="text-primary" />
      </div>

      {/* Total in Naira */}
      {stats.closed > 0 && (
        <div className={`text-center text-[11px] font-mono py-1.5 rounded-lg border ${stats.totalPnlNGN >= 0 ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-red-500/30 bg-red-500/10 text-red-400"}`}>
          Net P&L: ₦{fmt(stats.totalPnlNGN.toFixed(0))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1.5">
        {(["all", "open", "win", "loss"] as const).map((f) => (
          <button
            key={f}
            data-testid={`filter-${f}`}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs font-mono border transition-colors ${
              filter === f ? "bg-primary border-primary text-white" : "bg-background border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div className="ml-auto text-[11px] text-muted-foreground self-center font-mono">{filtered.length} trades</div>
      </div>

      {/* Entries */}
      <div className="flex flex-col gap-2">
        {filtered.map((entry) => (
          <TradeCard
            key={entry.id}
            entry={entry}
            onDelete={() => remove(entry.id)}
            onClose={() => setCloseTarget(entry)}
          />
        ))}
      </div>

      {closeTarget && (
        <CloseModal
          entry={closeTarget}
          onClose={() => setCloseTarget(null)}
          onSave={refresh}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-secondary border border-border rounded-xl p-2.5 text-center">
      <div className={`text-base font-bold font-mono ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function TradeCard({ entry, onDelete, onClose }: { entry: TradeEntry; onDelete: () => void; onClose: () => void }) {
  const isOpen = entry.outcome === null;
  const isWin = entry.outcome === "win";
  const isLoss = entry.outcome === "loss";

  return (
    <div className={`bg-secondary border rounded-xl p-3 transition-colors ${
      isOpen ? "border-border" : isWin ? "border-green-500/30" : isLoss ? "border-red-500/30" : "border-yellow-500/30"
    }`}
      data-testid={`trade-card-${entry.id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-foreground">{entry.pair}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded font-mono ${
              entry.direction === "buy" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
            }`}>
              {entry.direction.toUpperCase()}
            </span>
            {!isOpen && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                isWin ? "bg-green-500/15 text-green-400" : isLoss ? "bg-red-500/15 text-red-400" : "bg-yellow-500/15 text-yellow-400"
              }`}>
                {entry.outcome === "win" ? "WIN" : entry.outcome === "loss" ? "LOSS" : "B/E"}
              </span>
            )}
            {isOpen && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-primary/15 text-primary">OPEN</span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{timeAgo(entry.date)}</div>
        </div>
        <div className="flex items-center gap-1">
          {isOpen && (
            <button
              data-testid={`btn-close-trade-${entry.id}`}
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Close trade"
            >
              <Edit3 size={13} />
            </button>
          )}
          <button
            data-testid={`btn-delete-trade-${entry.id}`}
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-[11px]">
        <InfoPair label="Lots" value={entry.lotSize < 0.01 ? entry.lotSize.toFixed(4) : entry.lotSize.toFixed(2)} />
        <InfoPair label="Risk" value={`$${entry.riskUSD.toFixed(2)}`} />
        <InfoPair label="R:R" value={entry.rr ? `1:${entry.rr}` : "—"} />
        <InfoPair label="SL" value={`${entry.slPips}p`} />
        <InfoPair label="TP" value={entry.tpPips ? `${entry.tpPips}p` : "—"} />
        <InfoPair label="₦ Risk" value={`₦${fmt(entry.riskNGN.toFixed(0))}`} />
      </div>

      {entry.pnlUSD != null && (
        <div className={`flex items-center gap-1.5 mt-2 pt-2 border-t border-border/50 text-sm font-mono font-bold ${isWin ? "text-green-400" : isLoss ? "text-red-400" : "text-yellow-400"}`}>
          {isWin ? <TrendingUp size={13} /> : isLoss ? <TrendingDown size={13} /> : <MinusCircle size={13} />}
          {entry.pnlUSD >= 0 ? "+" : ""}${entry.pnlUSD.toFixed(2)}
          <span className="text-[11px] text-muted-foreground font-normal ml-1">
            ≈ ₦{fmt((entry.pnlNGN ?? 0).toFixed(0))}
          </span>
        </div>
      )}

      {entry.notes && (
        <div className="mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground font-mono">
          {entry.notes}
        </div>
      )}
    </div>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="text-foreground font-mono">{value}</span>
    </div>
  );
}
