// weather-now/main.js
// Returns current weather for a location via wttr.in JSON API.
// No API key required. Different from weather-briefing (alarm/forecast).

const ctx = JSON.parse(__context__);
const config = ctx.config || {};
const user = ctx.user || {};

const location = (user.location && user.location.city) || config.location || "Seoul";
const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;

let data;
try {
  const raw = Http.get(url);
  data = JSON.parse(raw);
} catch (e) {
  return `날씨 조회 실패: ${e}`;
}

const cur = (data && data.current_condition && data.current_condition[0]) || null;
const area = (data && data.nearest_area && data.nearest_area[0]) || null;
if (!cur) {
  return "날씨 조회 실패: current_condition 정보가 없습니다.";
}

const cityName = (area && area.areaName && area.areaName[0] && area.areaName[0].value) || location;
const tempC = cur.temp_C;
const feelsC = cur.FeelsLikeC;
const humidity = cur.humidity;
const desc = (cur.weatherDesc && cur.weatherDesc[0] && cur.weatherDesc[0].value) || "";
const wind = cur.windspeedKmph;
const wdir = cur.winddir16Point || "";

return [
  `🌤 ${cityName} 날씨`,
  ``,
  `${desc}`,
  `기온: ${tempC}°C (체감 ${feelsC}°C)`,
  `습도: ${humidity}%`,
  `바람: ${wind} km/h ${wdir}`,
  ``,
  `_Source: wttr.in · Powered by KittyPaw_`,
].join("\n");
