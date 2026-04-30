// weather-now/main.js
// Returns current weather for a location.
//   - 한국 좌표 (lat∈[33,39], lon∈[124,132]): KittyAPI KMA village forecast
//   - 그 외: wttr.in (도시 이름 검색)
// No external API key required (KittyAPI proxies the KMA service key).
// Different from weather-briefing (alarm/forecast).

// SKY: 1=맑음, 3=구름많음, 4=흐림. PTY: 0=없음, 1=비, 2=비눈, 3=눈, 5=빗방울, 6=빗방울눈날림, 7=눈날림.
// (Declared at the top so the KMA path below can reference them — const has
// no hoisting and would otherwise hit the temporal dead zone.)
const KMA_SKY = { "1": "맑음", "3": "구름많음", "4": "흐림" };
const KMA_PTY = { "0": "", "1": "비", "2": "비/눈", "3": "눈", "5": "빗방울", "6": "빗방울/눈날림", "7": "눈날림" };

const ctx = JSON.parse(__context__);
const config = ctx.config || {};
const user = ctx.user || {};

// Resolve coordinates: user context > package config.
const userLoc = user.location || {};
const lat = Number.isFinite(userLoc.lat) ? userLoc.lat : parseFloat(config.latitude);
const lon = Number.isFinite(userLoc.lon) ? userLoc.lon : parseFloat(config.longitude);

const isKR =
  Number.isFinite(lat) && Number.isFinite(lon) &&
  lat >= 33 && lat <= 39 && lon >= 124 && lon <= 132;

if (isKR) {
  const apiUrl = config.api_url || "https://api.kittypaw.app";
  try {
    const raw = Http.get(
      `${apiUrl}/v1/weather/kma/village-fcst?lat=${lat}&lon=${lon}`,
      { timeout_ms: 8000 }
    );
    const cur = extractKMACurrent(JSON.parse(raw));
    if (cur) return formatKMA(cur, userLoc.city || config.location || "현재 위치");
    // KMA returned but envelope wasn't parseable — fall through to wttr.in.
  } catch (e) {
    // KMA failed (network, 502, etc.) — silently fall through.
  }
}

// Fallback / non-KR path: wttr.in by city name.
const location = userLoc.city || config.location || "Seoul";
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

// --- KMA helpers (inline; Phase B will move them server-side) -----------

// extractKMACurrent picks the earliest forecast slot from the KMA envelope
// and pivots the category-coded items into a flat object.
function extractKMACurrent(kma) {
  const items = (kma && kma.response && kma.response.body &&
                 kma.response.body.items && kma.response.body.items.item) || [];
  if (items.length === 0) return null;
  // Items are typically time-sorted upstream; if not, find the smallest
  // (fcstDate, fcstTime) tuple. fcstDate=YYYYMMDD, fcstTime=HHMM — both
  // zero-padded fixed-width, so string < works as time <.
  let firstKey = `${items[0].fcstDate}${items[0].fcstTime}`;
  for (const it of items) {
    const k = `${it.fcstDate}${it.fcstTime}`;
    if (k < firstKey) firstKey = k;
  }
  const cats = {};
  for (const it of items) {
    if (`${it.fcstDate}${it.fcstTime}` === firstKey) {
      cats[it.category] = it.fcstValue;
    }
  }
  cats._when = firstKey;
  return cats;
}

function formatKMA(cur, label) {
  const sky = KMA_SKY[cur.SKY] || "";
  const pty = KMA_PTY[cur.PTY] || "";
  const desc = pty || sky || "—";
  const tmp = cur.TMP != null ? `${cur.TMP}°C` : "—";
  const reh = cur.REH != null ? `${cur.REH}%` : "—";
  const wsd = cur.WSD != null ? `${cur.WSD} m/s` : "—";
  const pop = cur.POP != null ? `${cur.POP}%` : "—";
  return [
    `🌤 ${label} 날씨 (KMA 단기예보)`,
    ``,
    `${desc}`,
    `기온: ${tmp}`,
    `습도: ${reh}`,
    `바람: ${wsd}`,
    `강수확률: ${pop}`,
    ``,
    `_Source: 기상청 (KMA) · Powered by KittyPaw_`,
  ].join("\n");
}
