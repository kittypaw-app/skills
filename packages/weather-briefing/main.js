// weather-briefing/main.js
// Fetches a 7-day weather forecast from Open-Meteo (free, no API key)
// and summarizes it with LLM. Language is handled by the engine via
// context = ["locale"] — no language logic needed here.

const ctx = JSON.parse(__context__);
const config = ctx.config || {};
const user = ctx.user || {};

// Location: user context > package config > defaults
const loc = user.location || {};
const city = loc.city || config.city || "Seoul";
const latitude = loc.lat || parseFloat(config.latitude) || 37.57;
const longitude = loc.lon || parseFloat(config.longitude) || 126.98;

// --- Fetch forecast from Open-Meteo ---
const forecastUrl =
  `https://api.open-meteo.com/v1/forecast` +
  `?latitude=${latitude}&longitude=${longitude}` +
  `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode` +
  `&timezone=auto`;

// KMA fallback — Open-Meteo 실패 시 한국 좌표 한정으로 KittyAPI KMA proxy 시도.
// 기상청 단기예보가 KR 정확도는 더 높지만, raw envelope 이 Open-Meteo 와 다르므로
// 이 skill 은 fallback 만 하고 정규화는 Phase B (별도 plan) 에서.
async function tryKMAFallback() {
  // Number.isFinite rejects NaN/Infinity which would otherwise pass the
  // range check below (NaN < 33 is false, so a malformed config would
  // reach the API).
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < 33 || latitude > 39 || longitude < 124 || longitude > 132) return null;
  try {
    const apiUrl = config.api_url || "https://api.kittypaw.app";
    const raw = await Http.get(
      `${apiUrl}/v1/weather/kma/village-fcst?lat=${latitude}&lon=${longitude}`,
      { timeout_ms: 5000 }
    );
    return raw;
  } catch (e) {
    return null;
  }
}

let forecast;
let kmaRaw = null;
try {
  const raw = await Http.get(forecastUrl);
  forecast = JSON.parse(raw);
} catch (e) {
  kmaRaw = await tryKMAFallback();
  if (kmaRaw === null) {
    return `Error fetching weather data: ${e}`;
  }
}

// KMA fallback path — raw envelope, no daily structure. Hand it to the LLM
// directly and return early. Phase B will normalise into the standard
// {dates, maxTemps, minTemps, precip} shape used below.
if (kmaRaw !== null) {
  const today = new Date().toISOString().slice(0, 10);
  const kmaAttribution = attributionFromPayload(kmaRaw);
  const kmaPrompt =
    `Today is ${today}. The city is ${city}.\n\n` +
    `Korea KMA village forecast (raw envelope; parse response.body.items.item — ` +
    `each item has category code TMP=temperature, SKY=sky condition, POP=precipitation chance):\n` +
    `${kmaRaw.slice(0, 3000)}\n\n` +
    `Write a friendly 2-4 sentence weather briefing. ` +
    `Highlight today's temperature, sky, and rain chance.`;
  let kmaSummary = "";
  try {
    const llmRaw = await Llm.generate(kmaPrompt);
    const llmData = JSON.parse(llmRaw);
    kmaSummary = llmData.text || "";
  } catch (e) {
    kmaSummary = "(LLM summary unavailable)";
  }
  const lines = [
    `🌤 *Weather Briefing — ${city} (${today})*`,
    ``,
    `*Summary*`,
    kmaSummary,
  ];
  appendAttribution(lines, kmaAttribution);
  return lines.join("\n");
}

const daily = forecast.daily;
const dates = daily.time;
const maxTemps = daily.temperature_2m_max;
const minTemps = daily.temperature_2m_min;
const precip = daily.precipitation_sum;

// Build a compact text table for the next 7 days
const rows = dates.map((date, i) => {
  const rain = precip[i] != null ? `${precip[i].toFixed(1)}mm` : "—";
  return `${date}  ${maxTemps[i]}°C / ${minTemps[i]}°C  rain:${rain}`;
});
const forecastTable = rows.join("\n");

// Ask LLM to summarize — engine auto-injects locale instruction
const today = dates[0];
const prompt =
  `Today is ${today}. The city is ${city}.\n\n` +
  `7-day weather forecast:\n${forecastTable}\n\n` +
  `Write a friendly 2-4 sentence weather briefing. ` +
  `Highlight today's conditions, any notable rain or temperature changes, ` +
  `and a practical tip (e.g. bring an umbrella, wear layers).`;

let summary = "";
try {
  const llmRaw = await Llm.generate(prompt);
  const llmData = JSON.parse(llmRaw);
  summary = llmData.text || "";
} catch (e) {
  summary = "(LLM summary unavailable)";
}

// Format result message
const lines = [
  `🌤 *Weather Briefing — ${city} (${today})*`,
  ``,
  `*7-Day Forecast*`,
  "```",
  forecastTable,
  "```",
  ``,
  `*Summary*`,
  summary,
  ``,
  `Weather data by Open-Meteo.com (https://open-meteo.com)`,
];

return lines.join("\n");

function attributionFromPayload(raw) {
  try {
    return JSON.parse(raw).attribution || null;
  } catch (e) {
    return null;
  }
}

function appendAttribution(lines, attribution) {
  if (!attribution || attribution.required !== true) return;
  const label = attribution.label || attribution.name || attribution.source || "";
  if (label) lines.push("", label);
}
