// weather-now/main.js
// 현재 시점 (지금 / 현재 / 방금) 날씨를 즉답합니다.
//   - 한국 좌표 (lat∈[33,39], lon∈[124,132]): KittyAPI KMA 초단기실황
//   - 그 외: wttr.in (도시 이름 검색)
// 1시간 이상 미래 발화는 weather-soon (초단기예보) 또는 weather-briefing (단기예보) 로.
// KittyAPI proxies the KMA service key — no external API key required.

// PTY codes (실황 = 관측, SKY 없음): 0=맑음/구름, 1=비, 2=비/눈, 3=눈, 5=빗방울, 6=빗방울/눈날림, 7=눈날림.
// File-top const — formatKMA 가 아래에서 참조 (TDZ 회피).
const KMA_PTY_NCST = {
  "0": "맑음/구름",
  "1": "비",
  "2": "비/눈",
  "3": "눈",
  "5": "빗방울",
  "6": "빗방울/눈날림",
  "7": "눈날림",
};

const ctx = JSON.parse(__context__);
const config = ctx.config || {};
const params = ctx.params || {};
const user = ctx.user || {};

// Resolve coordinates: engine-provided structured params > user context > package config.
// Natural-language parsing belongs to the KittyPaw engine/LLM layer; this
// package only consumes structured input.
const paramLoc = params.location || {};
const userLoc = user.location || {};
const loc = hasCoords(paramLoc) ? paramLoc : userLoc;
const lat = hasCoords(loc) ? toNumber(loc.lat) : parseFloat(config.latitude);
const lon = hasCoords(loc) ? toNumber(loc.lon) : parseFloat(config.longitude);
const label = loc.label || loc.city || config.location || "현재 위치";

const isKR =
  Number.isFinite(lat) && Number.isFinite(lon) &&
  lat >= 33 && lat <= 39 && lon >= 124 && lon <= 132;

if (isKR) {
  const apiUrl = config.api_url || "https://api.kittypaw.app";
  try {
    const raw = Http.get(
      `${apiUrl}/v1/weather/kma/ultra-srt-ncst?lat=${lat}&lon=${lon}`,
      { timeout_ms: 8000 }
    );
    const payload = JSON.parse(raw);
    const cur = extractKMAFirstSlot(payload, "obsrValue");
    if (cur) return formatKMA(cur, label, payload.attribution);
    // KMA returned but envelope wasn't parseable — fall through to wttr.in.
  } catch (e) {
    // KMA failed (network, 502, etc.) — silently fall through.
  }
}

// Fallback / non-KR path: wttr.in by city name.
const location = loc.city || loc.label || config.location || "Seoul";
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

const cityName = location || (area && area.areaName && area.areaName[0] && area.areaName[0].value) || "현재 위치";
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
].join("\n");

// --- KMA helpers (inline; Phase B will move them server-side) -----------

function attributionLine(attribution) {
  if (!attribution || attribution.required !== true) return "";
  return attribution.label || attribution.name || attribution.source || "";
}

function appendAttribution(lines, attribution) {
  const line = attributionLine(attribution);
  if (line) lines.push("", line);
  return lines;
}

function toNumber(value) {
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : NaN;
}

function hasCoords(location) {
  if (!location) return false;
  return Number.isFinite(toNumber(location.lat)) && Number.isFinite(toNumber(location.lon));
}

// extractKMAFirstSlot flattens KMA envelope items into a category-keyed map.
// Single-slot envelope (실황 = nowcast, timeKeyFn omitted): flatten all items.
// Multi-slot envelope (예보, timeKeyFn provided): pick the earliest slot only.
// Identical signature in weather-soon — keeps the contract symmetric across skills.
function extractKMAFirstSlot(kma, valueField, timeKeyFn) {
  const items = (kma && kma.response && kma.response.body &&
                 kma.response.body.items && kma.response.body.items.item) || [];
  if (items.length === 0) return null;
  const cats = {};
  if (!timeKeyFn) {
    for (const it of items) cats[it.category] = it[valueField];
    return cats;
  }
  let firstKey = timeKeyFn(items[0]);
  for (const it of items) {
    const k = timeKeyFn(it);
    if (k < firstKey) firstKey = k;
  }
  for (const it of items) {
    if (timeKeyFn(it) === firstKey) cats[it.category] = it[valueField];
  }
  cats._when = firstKey;
  return cats;
}

function formatKMA(cur, label, attribution) {
  const desc = KMA_PTY_NCST[cur.PTY] || "—";
  const tmp = cur.T1H != null ? `${cur.T1H}°C` : "—";
  const reh = cur.REH != null ? `${cur.REH}%` : "—";
  const wsd = cur.WSD != null ? `${cur.WSD} m/s` : "—";
  const rn1 = (cur.RN1 != null && cur.RN1 !== "0" && cur.RN1 !== "강수없음")
    ? `${cur.RN1}` : "없음";
  return appendAttribution([
    `🌤 ${label} 현재 날씨`,
    ``,
    desc,
    `기온: ${tmp}`,
    `습도: ${reh}`,
    `바람: ${wsd}`,
    `1시간 강수: ${rn1}`,
  ], attribution).join("\n");
}
