import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function runWeatherNow(ctx) {
  const code = await readFile("packages/weather-now/main.js", "utf8");
  const calls = [];
  const Http = {
    get(url) {
      calls.push(url);
      if (url.includes("/ultra-srt-ncst")) {
        return JSON.stringify({
          response: {
            body: {
              items: {
                item: [
                  { category: "PTY", obsrValue: "0" },
                  { category: "T1H", obsrValue: "22" },
                  { category: "REH", obsrValue: "55" },
                  { category: "WSD", obsrValue: "2.1" },
                  { category: "RN1", obsrValue: "0" },
                ],
              },
            },
          },
        });
      }
      if (url.includes("/ultra-srt-fcst")) {
        return JSON.stringify({
          response: {
            body: {
              items: {
                item: [
                  { category: "SKY", fcstValue: "3", fcstDate: "20260506", fcstTime: "2200" },
                  { category: "PTY", fcstValue: "0", fcstDate: "20260506", fcstTime: "2200" },
                  { category: "T1H", fcstValue: "21", fcstDate: "20260506", fcstTime: "2200" },
                  { category: "REH", fcstValue: "60", fcstDate: "20260506", fcstTime: "2200" },
                  { category: "WSD", fcstValue: "2.5", fcstDate: "20260506", fcstTime: "2200" },
                  { category: "RN1", fcstValue: "0", fcstDate: "20260506", fcstTime: "2200" },
                ],
              },
            },
          },
        });
      }
      throw new Error(`unexpected URL: ${url}`);
    },
  };
  const fn = new Function("__context__", "Http", `return (async () => {\n${code}\n})()`);
  const output = await fn(JSON.stringify(ctx), Http);
  return { output, calls };
}

function weatherSearchIDs(index, query) {
  const q = query.toLowerCase();
  return index.packages
    .filter((entry) => {
      return [entry.id, entry.name, entry.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q));
    })
    .map((entry) => entry.id)
    .sort();
}

async function testWeatherNowKeepsCurrentWeatherPath() {
  const { output, calls } = await runWeatherNow({
    config: {},
    params: {
      location: { label: "서울", lat: 37.57, lon: 126.98 },
    },
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0], /ultra-srt-ncst/);
  assert.match(output, /서울 현재 날씨/);
  assert.match(output, /기온: 22°C/);
}

async function testWeatherNowHandlesImminentForecast() {
  const { output, calls } = await runWeatherNow({
    config: {},
    params: {
      location: { label: "서울", lat: 37.57, lon: 126.98 },
      time_scope: "3h",
    },
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0], /ultra-srt-fcst/);
  assert.match(output, /서울 22:00 임박 예보/);
  assert.match(output, /구름많음/);
}

async function testPublicWeatherSearchIsConsolidated() {
  const raw = await readFile("index.json", "utf8");
  const index = JSON.parse(raw);
  const ids = index.packages.map((entry) => entry.id);

  assert.ok(ids.includes("weather-now"), "weather-now remains installable");
  assert.ok(ids.includes("weather-briefing"), "weather-briefing remains installable");
  assert.ok(!ids.includes("weather-soon"), "weather-soon is not public-facing");
  assert.deepEqual(weatherSearchIDs(index, "날씨"), ["weather-briefing", "weather-now"]);

  const weatherNow = index.packages.find((entry) => entry.id === "weather-now");
  assert.equal(weatherNow.name, "날씨 조회");
  assert.match(weatherNow.description, /현재 날씨/);
  assert.match(weatherNow.description, /몇 시간 뒤/);
}

await testWeatherNowKeepsCurrentWeatherPath();
await testWeatherNowHandlesImminentForecast();
await testPublicWeatherSearchIsConsolidated();
console.log("weather consolidation tests passed");
