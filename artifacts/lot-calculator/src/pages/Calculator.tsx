import { useState, useCallback, useEffect } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const RATE_CACHE_KEY = "usdngn_rate_cache";
const RATE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function fetchLiveRate(): Promise<number | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data?.rates?.NGN;
    return typeof rate === "number" ? Math.round(rate) : null;
  } catch {
    return null;
  }
}

const PAIRS = [
  { label: "EURUSD", pip: 0.0001, contract: 100000 },
  { label: "GBPUSD", pip: 0.0001, contract: 100000 },
  { label: "USDJPY", pip: 0.01, contract: 100000 },
  { label: "XAUUSD", pip: 0.01, contract: 100 },
  { label: "BTCUSD", pip: 1, contract: 1 },
  { label: "NAS100", pip: 0.01, contract: 100 },
  { label: "Custom", pip: null, contract: null },
];

const DEFAULT_PIP_VALUES: Record<string, number> = {
  EURUSD: 10,
  GBPUSD: 10,
  USDJPY: 9.09,
  XAUUSD: 10,
  BTCUSD: 1,
  NAS100: 1,
};

const RISK_CHIPS = [0.5, 1, 1.5, 2, 3];

interface Result {
  pair: string;
  direction: string;
  lotSize: number;
  riskUSD: number;
  riskNGN: number;
  riskPct: number;
  profitUSD: number | null;
  profitNGN: number | null;
  rr: string | null;
  pipValuePerLot: number;
  slPips: number;
  tpPips: number;
  balUSD: number;
  balNGN: number;
}

function fmt(n: number | string): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function TgInput({
  id,
  placeholder,
  value,
  onChange,
  type = "number",
}: {
  id?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <input
      data-testid={id}
      id={id}
      type={type}
      step="any"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
    />
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-[11px] text-muted-foreground font-mono uppercase tracking-wide mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function ResultRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0 text-sm">
      <span className="text-muted-foreground text-[12px]">{label}</span>
      {children}
    </div>
  );
}

export default function Calculator() {
  const { toast } = useToast();
  const [balUSD, setBalUSD] = useState("");
  const [balNGN, setBalNGN] = useState("");
  const [usdRate, setUsdRate] = useState("1600");
  const [selectedPair, setSelectedPair] = useState(0);
  const [customPair, setCustomPair] = useState("");
  const [customPip, setCustomPip] = useState("");
  const [customContract, setCustomContract] = useState("");
  const [riskPct, setRiskPct] = useState("1");
  const [slPips, setSlPips] = useState("");
  const [tpPips, setTpPips] = useState("");
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [pipOverride, setPipOverride] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const [rateStatus, setRateStatus] = useState<"loading" | "live" | "cached" | "manual">("loading");

  useEffect(() => {
    const cached = localStorage.getItem(RATE_CACHE_KEY);
    if (cached) {
      try {
        const { rate, ts } = JSON.parse(cached);
        if (Date.now() - ts < RATE_TTL_MS && typeof rate === "number") {
          setUsdRate(String(rate));
          setRateStatus("cached");
          return;
        }
      } catch { /* stale cache, fall through */ }
    }
    fetchLiveRate().then((rate) => {
      if (rate) {
        setUsdRate(String(rate));
        setRateStatus("live");
        localStorage.setItem(RATE_CACHE_KEY, JSON.stringify({ rate, ts: Date.now() }));
      } else {
        setRateStatus("manual");
      }
    });
  }, []);

  const isCustom = PAIRS[selectedPair].label === "Custom";

  const calculate = useCallback(() => {
    const rate = parseFloat(usdRate) || 1600;
    const rp = parseFloat(riskPct) || 1;
    const sl = parseFloat(slPips);
    const tp = parseFloat(tpPips) || 0;

    if (!sl || sl <= 0) {
      toast({ title: "Enter a Stop Loss value in pips", variant: "destructive" });
      return;
    }

    let pairName: string;
    let pipSize: number;
    let contractSize: number;

    if (isCustom) {
      pairName = customPair || "Custom";
      pipSize = parseFloat(customPip);
      contractSize = parseFloat(customContract);
      if (!pipSize || !contractSize) {
        toast({ title: "Fill in custom pip size and contract size", variant: "destructive" });
        return;
      }
    } else {
      pairName = PAIRS[selectedPair].label;
      pipSize = PAIRS[selectedPair].pip!;
      contractSize = PAIRS[selectedPair].contract!;
    }

    let effectiveBalUSD = parseFloat(balUSD) || 0;
    const bnGN = parseFloat(balNGN) || 0;
    if (!effectiveBalUSD && bnGN) effectiveBalUSD = bnGN / rate;
    if (!effectiveBalUSD) {
      toast({ title: "Enter your account balance", variant: "destructive" });
      return;
    }
    const effectiveBalNGN = bnGN || effectiveBalUSD * rate;

    let pipValuePerLot = parseFloat(pipOverride) || 0;
    if (!pipValuePerLot) {
      pipValuePerLot = DEFAULT_PIP_VALUES[pairName] ?? pipSize * contractSize;
    }

    const riskUSD = (rp / 100) * effectiveBalUSD;
    const lotSize = riskUSD / (sl * pipValuePerLot);
    const profitUSD = tp ? tp * pipValuePerLot * lotSize : null;
    const riskNGN = riskUSD * rate;
    const profitNGN = profitUSD != null ? profitUSD * rate : null;
    const rr = tp ? (tp / sl).toFixed(2) : null;

    setResult({
      pair: pairName,
      direction,
      lotSize,
      riskUSD,
      riskNGN,
      riskPct: rp,
      profitUSD,
      profitNGN,
      rr,
      pipValuePerLot,
      slPips: sl,
      tpPips: tp,
      balUSD: effectiveBalUSD,
      balNGN: effectiveBalNGN,
    });
  }, [balUSD, balNGN, usdRate, selectedPair, customPair, customPip, customContract, riskPct, slPips, tpPips, direction, pipOverride, isCustom, toast]);

  const reset = () => {
    setBalUSD(""); setBalNGN(""); setRiskPct("1"); setSlPips(""); setTpPips("");
    setPipOverride(""); setCustomPair(""); setCustomPip(""); setCustomContract("");
    setResult(null);
  };

  const copyResult = () => {
    if (!result) return;
    const text = `📊 ${result.pair} — ${result.direction.toUpperCase()}
Lot Size: ${result.lotSize < 0.01 ? result.lotSize.toFixed(4) : result.lotSize.toFixed(2)} lots
Risk: $${result.riskUSD.toFixed(2)} (${result.riskPct}%) | ₦${fmt(result.riskNGN.toFixed(0))}
Profit: ${result.profitUSD != null ? `$${result.profitUSD.toFixed(2)} | ₦${fmt((result.profitNGN ?? 0).toFixed(0))}` : "— (no TP)"}
R:R ${result.rr ? `1:${result.rr}` : "—"}
SL/TP: ${result.slPips} / ${result.tpPips || "—"} pips
Balance: $${result.balUSD.toFixed(2)} / ₦${fmt(result.balNGN.toFixed(0))}
— LotCalc Bot`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const riskColor =
    parseFloat(riskPct) <= 1 ? "bg-green-500" : parseFloat(riskPct) <= 2 ? "bg-yellow-400" : "bg-red-500";
  const riskBarWidth = `${Math.min((parseFloat(riskPct) || 0) / 10 * 100, 100)}%`;

  return (
    <div className="flex flex-col gap-1.5 p-3 pb-4">
      {/* Greeting */}
      <div className="bg-secondary border border-border rounded-tl rounded-tr-2xl rounded-br-2xl rounded-bl-2xl px-3.5 py-2.5 max-w-[88%] self-start">
        <div className="text-[11px] text-primary font-semibold mb-1 font-mono">LotCalc Bot</div>
        <div className="text-sm leading-relaxed">
          <b>Welcome!</b> I'll calculate your lot size, risk, and P&amp;L in both USD and Naira.
          <br /><br />Fill in your trade details below 👇
        </div>
      </div>

      {/* Form bubble */}
      <div className="bg-secondary border border-border rounded-tl rounded-tr-2xl rounded-br-2xl rounded-bl-2xl p-3.5 w-[calc(100%-8px)] self-start">
        <div className="text-[11px] text-primary font-semibold mb-2.5 font-mono">LotCalc Bot</div>

        {/* Balance */}
        <FieldGroup label="💰 Account Balance">
          <div className="flex gap-2">
            <TgInput id="input-balance-usd" placeholder="USD balance" value={balUSD} onChange={setBalUSD} />
            <TgInput id="input-balance-ngn" placeholder="₦ Naira balance" value={balNGN} onChange={setBalNGN} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 font-mono flex items-center gap-1 flex-wrap">
            USD/NGN rate:
            <input
              data-testid="input-usd-rate"
              type="number"
              value={usdRate}
              onChange={(e) => { setUsdRate(e.target.value); setRateStatus("manual"); }}
              className="bg-transparent border-b border-border text-primary font-mono text-[11px] w-20 px-1 outline-none"
            />
            {rateStatus === "loading" && <span className="text-muted-foreground">fetching…</span>}
            {rateStatus === "live" && <span className="text-green-400">● live</span>}
            {rateStatus === "cached" && <span className="text-yellow-400">● cached</span>}
            {rateStatus === "manual" && <span className="text-muted-foreground">(manual)</span>}
          </div>
        </FieldGroup>

        {/* Pair */}
        <FieldGroup label="📈 Instrument">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PAIRS.map((p, i) => (
              <button
                key={p.label}
                data-testid={`tab-pair-${p.label.toLowerCase()}`}
                onClick={() => setSelectedPair(i)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-colors ${
                  selectedPair === i
                    ? "bg-primary border-primary text-white"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {isCustom && (
            <div className="flex flex-col gap-2">
              <TgInput id="input-custom-pair" placeholder="Pair name (e.g. EURJPY)" value={customPair} onChange={setCustomPair} type="text" />
              <div className="flex gap-2">
                <TgInput id="input-custom-pip" placeholder="Pip size (e.g. 0.0001)" value={customPip} onChange={setCustomPip} />
                <TgInput id="input-custom-contract" placeholder="Contract size (e.g. 100000)" value={customContract} onChange={setCustomContract} />
              </div>
            </div>
          )}
        </FieldGroup>

        {/* Risk % */}
        <FieldGroup label="⚡ Risk %">
          <TgInput id="input-risk-pct" placeholder="Risk %" value={riskPct} onChange={setRiskPct} />
          <div className="flex gap-1.5 mt-1.5">
            {RISK_CHIPS.map((r) => (
              <button
                key={r}
                data-testid={`chip-risk-${r}`}
                onClick={() => setRiskPct(String(r))}
                className={`px-2 py-0.5 rounded-md text-[12px] font-mono border transition-colors ${
                  parseFloat(riskPct) === r
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}%
              </button>
            ))}
          </div>
        </FieldGroup>

        {/* SL / TP */}
        <FieldGroup label="🎯 Stop Loss & Take Profit (pips)">
          <div className="flex gap-2">
            <TgInput id="input-sl-pips" placeholder="SL pips" value={slPips} onChange={setSlPips} />
            <TgInput id="input-tp-pips" placeholder="TP pips" value={tpPips} onChange={setTpPips} />
          </div>
        </FieldGroup>

        {/* Direction */}
        <FieldGroup label="📍 Direction">
          <div className="flex gap-2">
            {(["buy", "sell"] as const).map((d) => (
              <button
                key={d}
                data-testid={`btn-direction-${d}`}
                onClick={() => setDirection(d)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  direction === d
                    ? d === "buy"
                      ? "bg-green-500/20 border-green-500 text-green-400"
                      : "bg-red-500/20 border-red-500 text-red-400"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {d === "buy" ? "📈 BUY / Long" : "📉 SELL / Short"}
              </button>
            ))}
          </div>
        </FieldGroup>

        {/* Pip override */}
        <FieldGroup label="💵 Pip Value per Lot (USD) — optional override">
          <TgInput id="input-pip-override" placeholder="Leave blank for auto" value={pipOverride} onChange={setPipOverride} />
        </FieldGroup>

        <div className="flex gap-2 mt-1">
          <button
            data-testid="btn-calculate"
            onClick={calculate}
            className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
          >
            🧮 Calculate
          </button>
          <button
            data-testid="btn-reset"
            onClick={reset}
            className="flex-1 bg-secondary border border-border hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw size={13} /> Reset
          </button>
        </div>
      </div>

      {/* Result bubble */}
      {result && (
        <div className="bg-secondary border border-border rounded-tl rounded-tr-2xl rounded-br-2xl rounded-bl-2xl p-3.5 w-[calc(100%-8px)] self-start animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="text-[11px] text-primary font-semibold mb-2.5 font-mono">LotCalc Bot</div>
          <div className="text-[13px] text-muted-foreground font-mono border-b border-border pb-2 mb-2">
            📊 {result.pair} — {result.direction.toUpperCase()}
          </div>

          <ResultRow label="Lot Size">
            <span className="text-primary font-mono font-bold">
              {result.lotSize < 0.01 ? result.lotSize.toFixed(4) : result.lotSize.toFixed(2)} lots
            </span>
          </ResultRow>
          <ResultRow label="Risk Amount">
            <span className="text-red-400 font-mono font-bold">
              ${result.riskUSD.toFixed(2)} ({result.riskPct}%)
            </span>
          </ResultRow>
          <ResultRow label="Risk (Naira)">
            <span className="text-red-400 font-mono font-bold">₦{fmt(result.riskNGN.toFixed(0))}</span>
          </ResultRow>

          <div className="h-px bg-border my-2" />

          <ResultRow label="Potential Profit (TP)">
            <span className="text-green-400 font-mono font-bold">
              {result.profitUSD != null ? `$${result.profitUSD.toFixed(2)}` : "— (no TP set)"}
            </span>
          </ResultRow>
          <ResultRow label="Profit (Naira)">
            <span className="text-green-400 font-mono font-bold">
              {result.profitNGN != null ? `₦${fmt(result.profitNGN.toFixed(0))}` : "—"}
            </span>
          </ResultRow>

          <div className="h-px bg-border my-2" />

          <ResultRow label="RR Ratio">
            <span className="text-yellow-400 font-mono font-bold">
              {result.rr ? `1 : ${result.rr}` : "— (no TP set)"}
            </span>
          </ResultRow>
          <ResultRow label="Pip Value">
            <span className="font-mono">${result.pipValuePerLot.toFixed(2)}/pip/lot</span>
          </ResultRow>
          <ResultRow label="SL / TP pips">
            <span className="font-mono">{result.slPips} / {result.tpPips || "—"} pips</span>
          </ResultRow>
          <ResultRow label="Balance">
            <span className="font-mono">${result.balUSD.toFixed(2)} / ₦{fmt(result.balNGN.toFixed(0))}</span>
          </ResultRow>

          {/* Risk bar */}
          <div className="mt-3 mb-1">
            <div className="text-[11px] text-muted-foreground font-mono mb-1.5">Risk Level</div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${riskColor}`}
                style={{ width: riskBarWidth }}
              />
            </div>
          </div>

          <div className="mt-3">
            <button
              data-testid="btn-copy"
              onClick={copyResult}
              className="w-full bg-secondary border border-border hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg py-2 text-sm flex items-center justify-center gap-1.5 transition-colors"
            >
              <Copy size={13} />
              {copied ? "✅ Copied!" : "📋 Copy for Telegram"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
