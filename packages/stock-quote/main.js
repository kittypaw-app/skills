// stock-quote/main.js
// Fetches current Korean stock quotes from Naver Securities.
// No external API key is required for the default KRX/KOSPI/KOSDAQ path.

const ctx = JSON.parse(__context__);
const config = ctx.config || {};
const params = ctx.params || {};

const query = String(params.symbol || params.stock || params.query || config.default_symbol || "005930").trim();
if (!query) return "조회할 종목명 또는 6자리 종목코드를 알려주세요. 예: 삼성전자, 005930";

let resolved;
try {
  resolved = resolveKoreanStock(query);
} catch (e) {
  return `종목 검색 실패: ${e}`;
}
if (!resolved || !resolved.code) {
  return `종목을 찾지 못했어요: ${query}. 종목명이나 6자리 종목코드로 다시 알려주세요.`;
}

let data;
try {
  const raw = Http.get(`https://m.stock.naver.com/api/stock/${resolved.code}/basic`);
  data = JSON.parse(raw);
} catch (e) {
  return `주가 조회 실패: ${e}`;
}

const code = data.itemCode || resolved.code;
const name = data.stockName || resolved.name || query;
const price = data.closePrice || data.currentPrice;
if (!price) {
  return `주가 조회 실패: ${name}(${code}) 응답에 현재가가 없습니다.`;
}

const change = data.compareToPreviousClosePrice || "0";
const changePct = data.fluctuationsRatio || "0";
const direction = data.compareToPreviousPrice || {};
const arrow = direction.text === "하락" || direction.code === "5" ? "▼" :
  direction.text === "상승" || direction.code === "2" ? "▲" : "-";
const market = data.stockExchangeName || resolved.market || "";
const status = formatMarketStatus(data.marketStatus);
const tradedAt = formatKoreanDateTime(data.localTradedAt);

const lines = [
  `💹 ${name}(${code}) 현재가`,
  ``,
  `현재가: ${price}원`,
  `전일대비: ${arrow} ${change}원 (${changePct}%)`,
];
const marketLine = [market, status].filter(Boolean).join(" / ");
if (marketLine) lines.push(marketLine);
if (tradedAt) lines.push(`기준: ${tradedAt}`);
lines.push(
  ``,
  `_Source: 네이버 증권_`,
);

return lines.join("\n");

function resolveKoreanStock(input) {
  const normalized = input.toUpperCase().replace(/\.(KS|KQ)$/i, "");
  if (/^\d{6}$/.test(normalized)) return { code: normalized, name: normalized };

  const raw = Http.get(`https://ac.stock.naver.com/ac?q=${encodeURIComponent(input)}&target=stock`);
  const payload = JSON.parse(raw);
  const items = Array.isArray(payload.items) ? payload.items : [];
  const exact = items.find(item => isKoreanStock(item) && item.name === input);
  const first = exact || items.find(isKoreanStock);
  if (!first) return null;
  return {
    code: first.code,
    name: first.name,
    market: first.typeName || first.typeCode || "",
  };
}

function isKoreanStock(item) {
  return item && item.nationCode === "KOR" && /^\d{6}$/.test(String(item.code || ""));
}

function formatKoreanDateTime(value) {
  if (!value) return "";
  return String(value).replace("T", " ").replace(/\+09:00$/, "");
}

function formatMarketStatus(value) {
  switch (value) {
    case "OPEN":
      return "장중";
    case "CLOSE":
      return "장마감";
    case "BEFORE":
      return "장전";
    default:
      return value || "";
  }
}
