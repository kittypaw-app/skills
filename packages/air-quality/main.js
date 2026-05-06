const ctx = JSON.parse(__context__);
const config = ctx.config || {};

const apiURL = config.api_url || "https://api.kittypaw.app";
const station = config.station || "종로구";

const url =
  `${apiURL}/v1/air/airkorea/realtime/station` +
  `?stationName=${encodeURIComponent(station)}` +
  `&dataTerm=DAILY`;

let data;
try {
  const raw = await Http.get(url);
  data = JSON.parse(raw);
} catch (e) {
  return `대기질 조회 실패: ${e}`;
}

if (data.error) {
  return `API 오류: ${data.error}`;
}

const header = data.response && data.response.header;
if (header && header.resultCode && header.resultCode !== "00") {
  return `API 오류: ${header.resultMsg || header.resultCode}`;
}

const body = data.response && data.response.body;
const items = data.items || data.data || (body && body.items) || [data];
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
  `_출처: 에어코리아_`,
].join("\n");

return message;
