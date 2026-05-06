import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function runStockAlert({ context, quote, stored = null }) {
  const code = await readFile("packages/stock-alert/main.js", "utf8");
  const storageWrites = [];
  const Http = {
    get(url) {
      assert.match(url, /m\.stock\.naver\.com\/api\/stock\/005930\/basic/);
      return JSON.stringify(quote);
    },
  };
  const Storage = {
    async get() {
      return stored;
    },
    async set(key, value) {
      storageWrites.push([key, value]);
    },
  };
  const fn = new Function("__context__", "Http", "Storage", `return (async () => {\n${code}\n})()`);
  const output = await fn(JSON.stringify(context), Http, Storage);
  return { output, storageWrites };
}

async function testParsesNaverCommaFormattedClosePrice() {
  const { output } = await runStockAlert({
    context: {
      config: {
        stock_code: "005930",
        stock_name: "삼성전자",
      },
    },
    quote: {
      stockName: "삼성전자",
      closePrice: "266,000",
    },
  });

  assert.match(output, /삼성전자\(005930\) 현재가 266,000원/);
  assert.doesNotMatch(output, /Could not parse/i);
}

async function testHighThresholdTriggersOnce() {
  const { output, storageWrites } = await runStockAlert({
    context: {
      config: {
        stock_code: "005930",
        stock_name: "삼성전자",
        target_high: "250000",
      },
    },
    quote: {
      stockName: "삼성전자",
      closePrice: "266,000",
    },
  });

  assert.match(output, /목표가 250,000원 돌파/);
  assert.equal(storageWrites.length, 1);
  assert.match(storageWrites[0][1], /"high":true/);
}

await testParsesNaverCommaFormattedClosePrice();
await testHighThresholdTriggersOnce();
console.log("stock-alert tests passed");
