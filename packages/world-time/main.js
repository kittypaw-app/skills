// world-time/main.js
// Fetches current time for an IANA timezone via timeapi.io.
// No API key required.

const ctx = JSON.parse(__context__);
const config = ctx.config || {};

const tz = config.timezone || "Asia/Seoul";
const url = `https://timeapi.io/api/Time/current/zone?timeZone=${encodeURIComponent(tz)}`;

let data;
try {
  const raw = Http.get(url);
  data = JSON.parse(raw);
} catch (e) {
  return `시간 조회 실패: ${e}`;
}

if (!data || !data.dateTime) {
  return `시간 조회 실패: '${tz}' 타임존을 찾지 못했습니다.`;
}

// dateTime example: "2026-04-25T18:34:56.789"
const date = (data.dateTime || "").slice(0, 10);
const time = (data.dateTime || "").slice(11, 19);
const day = data.dayOfWeek || "";
const dst = data.dstActive ? " (DST)" : "";

return [
  `🕒 ${tz} 현재 시각`,
  ``,
  `${date} ${time}${day ? " (" + day + ")" : ""}${dst}`,
  ``,
  `_Source: timeapi.io_`,
].join("\n");
