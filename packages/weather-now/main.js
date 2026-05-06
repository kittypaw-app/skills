// weather-now/main.js
// 현재 시점 (지금 / 현재 / 방금) 과 임박 미래 (1-6시간 후) 날씨를 즉답합니다.
//   - 한국 좌표 (lat∈[33,39], lon∈[124,132]): KittyAPI KMA 초단기실황/초단기예보
//   - 그 외: wttr.in (도시 이름 검색)
// 오늘/내일/주간 같은 단기예보/정기 발송은 weather-briefing 으로.
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
// SKY: 1=맑음, 3=구름많음, 4=흐림.
// PTY (예보, fcstValue): 0=없음, 1=비, 2=비/눈, 3=눈, 5=빗방울, 6=빗방울/눈날림, 7=눈날림.
const KMA_SKY = { "1": "맑음", "3": "구름많음", "4": "흐림" };
const KMA_PTY_FCST = {
  "0": "",
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
const isImminent = wantsImminentForecast(params);

const isKR =
  Number.isFinite(lat) && Number.isFinite(lon) &&
  lat >= 33 && lat <= 39 && lon >= 124 && lon <= 132;

if (isKR) {
  const apiUrl = config.api_url || "https://api.kittypaw.app";
  try {
    if (isImminent) {
      const raw = Http.get(
        `${apiUrl}/v1/weather/kma/ultra-srt-fcst?lat=${lat}&lon=${lon}`,
        { timeout_ms: 8000 }
      );
      const payload = JSON.parse(raw);
      const cur = extractKMAFirstSlot(payload, "fcstValue", it => `${it.fcstDate}${it.fcstTime}`);
      if (cur) return formatKMAForecast(cur, label, payload.attribution);
    } else {
      const raw = Http.get(
        `${apiUrl}/v1/weather/kma/ultra-srt-ncst?lat=${lat}&lon=${lon}`,
        { timeout_ms: 8000 }
      );
      const payload = JSON.parse(raw);
      const cur = extractKMAFirstSlot(payload, "obsrValue");
      if (cur) return formatKMACurrent(cur, label, payload.attribution);
    }
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
  `🌤 ${cityName} 날씨${isImminent ? " (임박)" : ""}`,
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

function wantsImminentForecast(params) {
  const scope = String(
    params.time_scope || params.forecast_scope || params.weather_scope || params.mode || ""
  ).toLowerCase();
  if (!scope) return false;
  if (["now", "current", "present", "현재", "지금", "방금"].includes(scope)) return false;
  return /soon|imminent|later|hour|afternoon|evening|tonight|night|[1-6]h|시간|이따|오후|저녁|밤/.test(scope);
}

// extractKMAFirstSlot flattens KMA envelope items into a category-keyed map.
// Single-slot envelope (실황 = nowcast, timeKeyFn omitted): flatten all items.
// Multi-slot envelope (예보, timeKeyFn provided): pick the earliest slot only.
// Shared by the current and imminent forecast branches.
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

function formatKMACurrent(cur, label, attribution) {
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

function formatKMAForecast(cur, label, attribution) {
  const sky = KMA_SKY[cur.SKY] || "";
  const pty = KMA_PTY_FCST[cur.PTY] || "";
  const desc = pty || sky || "—";
  const tmp = cur.T1H != null ? `${cur.T1H}°C` : "—";
  const reh = cur.REH != null ? `${cur.REH}%` : "—";
  const wsd = cur.WSD != null ? `${cur.WSD} m/s` : "—";
  const rn1 = (cur.RN1 != null && cur.RN1 !== "0" && cur.RN1 !== "강수없음")
    ? `${cur.RN1}` : "없음";
  const t = cur._when ? `${cur._when.slice(8, 10)}:${cur._when.slice(10, 12)}` : "—";
  return appendAttribution([
    `🌤 ${label} ${t} 임박 예보`,
    ``,
    desc,
    `기온: ${tmp}`,
    `습도: ${reh}`,
    `바람: ${wsd}`,
    `1시간 강수: ${rn1}`,
  ], attribution).join("\n");
}
