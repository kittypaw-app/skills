const ctx = JSON.parse(__context__);
const config = ctx.config || {};

const apiURL = config.api_url || "http://localhost:8080";
const token = config.access_token || "";
const station = config.station || "종로구";

if (!token) {
  return [
    "로그인이 필요합니다. 터미널에서 다음 명령어를 실행하세요:",
    "",
    `  kittypaw login --api-url ${apiURL}`,
    "",
    "로그인 후 다시 시도해주세요.",
  ].join("\n");
}

const url = `${apiURL}/api/v1/airkorea?station=${encodeURIComponent(station)}`;

let data;
try {
  const raw = await Http.get(url, { headers: { "Authorization": `Bearer ${token}` } });
  data = JSON.parse(raw);
} catch (e) {
  if (String(e).indexOf("401") !== -1 || String(e).indexOf("403") !== -1) {
    return `인증이 만료되었습니다. 다시 로그인하세요:\n\n  kittypaw login --api-url ${apiURL}`;
  }
  return `대기질 조회 실패: ${e}`;
}

if (data.error) {
  return `API 오류: ${data.error}`;
}

const items = data.items || data.data || [data];
if (!items || items.length === 0) {
  return `${station} 측정소의 데이터가 없습니다.`;
}

const item = items[0];
const pm10 = item.pm10Value || item.pm10 || "-";
const pm25 = item.pm25Value || item.pm25 || "-";
const pm10Grade = item.pm10Grade1h || item.pm10Grade || "0";
const pm25Grade = item.pm25Grade1h || item.pm25Grade || "0";

const gradeMap = { "1": "좋음 😊", "2": "보통 🙂", "3": "나쁨 😷", "4": "매우나쁨 🚨" };
const pm10Text = gradeMap[pm10Grade] || "정보없음";
const pm25Text = gradeMap[pm25Grade] || "정보없음";

const needMask = parseInt(pm10Grade) >= 3 || parseInt(pm25Grade) >= 3;
const tip = needMask ? "🎭 마스크를 챙기세요!" : "✅ 야외 활동 괜찮아요.";

const message = [
  `🌫 *미세먼지 알림 — ${item.stationName || station}*`,
  ``,
  `미세먼지(PM10): ${pm10}㎍/㎥ — ${pm10Text}`,
  `초미세먼지(PM2.5): ${pm25}㎍/㎥ — ${pm25Text}`,
  ``,
  tip,
  ``,
  `_출처: 에어코리아 · Powered by KittyPaw_`,
].join("\n");

return message;
