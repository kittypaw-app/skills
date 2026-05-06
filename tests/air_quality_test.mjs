import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function runAirQuality({ context, response }) {
  const code = await readFile("packages/air-quality/main.js", "utf8");
  const calls = [];
  const Http = {
    get(url, options) {
      calls.push({ url, options });
      return JSON.stringify(response);
    },
  };
  const fn = new Function("__context__", "Http", `return (async () => {\n${code}\n})()`);
  const output = await fn(JSON.stringify(context), Http);
  return { output, calls };
}

async function testUsesKittyAPIAirKoreaProxyWithoutUserToken() {
  const { output, calls } = await runAirQuality({
    context: {
      config: {
        station: "종로구",
      },
    },
    response: {
      response: {
        header: { resultCode: "00", resultMsg: "NORMAL_CODE" },
        body: {
          items: [
            {
              dataTime: "2026-05-06 22:00",
              pm10Value: "29",
              pm25Value: "18",
              pm10Grade: "1",
              pm25Grade: "2",
            },
          ],
        },
      },
    },
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /^https:\/\/api\.kittypaw\.app\/v1\/air\/airkorea\/realtime\/station\?/);
  assert.match(calls[0].url, /stationName=%EC%A2%85%EB%A1%9C%EA%B5%AC/);
  assert.match(calls[0].url, /dataTerm=DAILY/);
  assert.equal(calls[0].options, undefined);
  assert.match(output, /미세먼지 알림/);
  assert.match(output, /종로구/);
  assert.match(output, /29/);
  assert.doesNotMatch(output, /로그인이 필요합니다/);
}

await testUsesKittyAPIAirKoreaProxyWithoutUserToken();
console.log("air-quality tests passed");
