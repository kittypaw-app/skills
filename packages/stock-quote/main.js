// stock-quote/main.js
// Fetches current stock quote via Alpha Vantage GLOBAL_QUOTE endpoint.
// Free tier: 25 requests/day, 5 requests/min. API key required.

const ctx = JSON.parse(__context__);
const config = ctx.config || {};

const apiKey = config.api_key;
if (!apiKey) {
  return "Alpha Vantage API key 가 설정되지 않았습니다. `kittypaw setup` 또는 config.toml 에서 stock-quote.api_key 를 입력하세요.";
}

const symbol = (config.default_symbol || "AAPL").toUpperCase();
const url =
  `https://www.alphavantage.co/query?function=GLOBAL_QUOTE` +
  `&symbol=${encodeURIComponent(symbol)}` +
  `&apikey=${encodeURIComponent(apiKey)}`;

let data;
try {
  const raw = Http.get(url);
  data = JSON.parse(raw);
} catch (e) {
  return `주가 조회 실패: ${e}`;
}

const quote = data && data["Global Quote"];
if (!quote || !quote["05. price"]) {
  // Alpha Vantage rate-limit / invalid-key 응답이 200 OK 본문에 들어옴
  if (data && data["Note"]) return `주가 조회 제한: ${data["Note"]}`;
  if (data && data["Error Message"]) return `주가 조회 실패: ${data["Error Message"]}`;
  return `주가 조회 실패: '${symbol}' 응답에 시세가 없습니다.`;
}

const price = parseFloat(quote["05. price"]).toFixed(2);
const change = quote["09. change"];
const changePct = quote["10. change percent"];
const high = quote["03. high"];
const low = quote["04. low"];
const volume = parseInt(quote["06. volume"], 10).toLocaleString();
const day = quote["07. latest trading day"];
const arrow = parseFloat(change) >= 0 ? "▲" : "▼";

return [
  `💹 ${symbol} 현재가 (${day})`,
  ``,
  `${arrow} $${price} (${change}, ${changePct})`,
  `고가: $${high}  /  저가: $${low}`,
  `거래량: ${volume}`,
  ``,
  `_Source: Alpha Vantage_`,
].join("\n");
