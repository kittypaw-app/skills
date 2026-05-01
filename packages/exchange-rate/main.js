// exchange-rate/main.js
// Fetches current exchange rates from Frankfurter (ECB-sourced, free, no key).
// API: https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW

const ctx = JSON.parse(__context__);
const config = ctx.config || {};
const params = ctx.params || {};

const base = normalizeCurrency(params.base || config.base || "USD");
const symbols = normalizeSymbols(params.symbols || config.symbols || "KRW,EUR,JPY,CNY,GBP");

const url = `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(symbols)}`;

let data;
try {
  const raw = Http.get(url);
  data = JSON.parse(raw);
} catch (e) {
  return `환율 조회 실패: ${e}`;
}

if (!data || !data.rates) {
  return "환율 조회 실패: 응답에 rates 가 없습니다.";
}

const rows = Object.entries(data.rates)
  .map(([code, rate]) => {
    const fmt = typeof rate === "number" ? rate.toLocaleString(undefined, { maximumFractionDigits: 4 }) : rate;
    return `1 ${base} = ${fmt} ${code}`;
  })
  .join("\n");

const lines = [
  `📈 환율 (${data.date || "오늘"})`,
  ``,
  rows,
];
appendAttribution(lines, data.attribution);
return lines.join("\n");

function normalizeCurrency(value) {
  return String(value || "USD").trim().toUpperCase();
}

function normalizeSymbols(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeCurrency).filter(Boolean).join(",");
  }
  return String(value || "KRW,EUR,JPY,CNY,GBP").trim().toUpperCase();
}

function appendAttribution(lines, attribution) {
  if (!attribution || attribution.required !== true) return;
  const label = attribution.label || attribution.name || attribution.source || "";
  if (label) lines.push("", label);
}
