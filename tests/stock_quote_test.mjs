import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function runStockQuote({ context, responses }) {
  const code = await readFile(new URL("../packages/stock-quote/main.js", import.meta.url), "utf8");
  const calls = [];
  const Http = {
    get(url) {
      calls.push(url);
      for (const [needle, payload] of responses) {
        if (url.includes(needle)) return JSON.stringify(payload);
      }
      throw new Error(`unexpected URL: ${url}`);
    },
  };
  const fn = new Function("__context__", "Http", `return (async () => {\n${code}\n})()`);
  const output = await fn(JSON.stringify(context), Http);
  return { output, calls };
}

async function testKoreanStockNameNeedsNoApiKey() {
  const { output, calls } = await runStockQuote({
    context: {
      config: {},
      params: { symbol: "삼성전자" },
    },
    responses: [
      [
        "ac.stock.naver.com/ac",
        {
          items: [
            { code: "005930", name: "삼성전자", typeCode: "KOSPI", nationCode: "KOR" },
            { code: "005935", name: "삼성전자우", typeCode: "KOSPI", nationCode: "KOR" },
          ],
        },
      ],
      [
        "m.stock.naver.com/api/stock/005930/basic",
        {
          itemCode: "005930",
          stockName: "삼성전자",
          closePrice: "73,500",
          compareToPreviousClosePrice: "1,200",
          compareToPreviousPrice: { code: "2", text: "상승" },
          fluctuationsRatio: "1.66",
          stockExchangeName: "KOSPI",
          marketStatus: "OPEN",
          localTradedAt: "2026-05-06T10:12:00+09:00",
        },
      ],
    ],
  });

  assert.equal(calls.length, 2);
  assert.match(calls[0], /ac\.stock\.naver\.com\/ac/);
  assert.match(calls[1], /m\.stock\.naver\.com\/api\/stock\/005930\/basic/);
  assert.match(output, /삼성전자\(005930\)/);
  assert.match(output, /73,500원/);
  assert.match(output, /▲ 1,200원 \(1\.66%\)/);
  assert.match(output, /KOSPI \/ 장중/);
  assert.doesNotMatch(output, /Alpha Vantage/i);
  assert.doesNotMatch(output, /api key/i);
}

async function testSixDigitCodeSkipsSearch() {
  const { output, calls } = await runStockQuote({
    context: {
      config: {},
      params: { symbol: "005930.KS" },
    },
    responses: [
      [
        "m.stock.naver.com/api/stock/005930/basic",
        {
          itemCode: "005930",
          stockName: "삼성전자",
          closePrice: "73,500",
          compareToPreviousClosePrice: "0",
          compareToPreviousPrice: { code: "3", text: "보합" },
          fluctuationsRatio: "0.00",
          stockExchangeName: "KOSPI",
          marketStatus: "CLOSE",
        },
      ],
    ],
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0], /m\.stock\.naver\.com\/api\/stock\/005930\/basic/);
  assert.match(output, /삼성전자\(005930\)/);
  assert.match(output, /- 0원 \(0\.00%\)/);
  assert.match(output, /KOSPI \/ 장마감/);
}

await testKoreanStockNameNeedsNoApiKey();
await testSixDigitCodeSkipsSearch();
console.log("stock-quote tests passed");
