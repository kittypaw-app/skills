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

let forecast;
try {
  const raw = await Http.get(forecastUrl);
  forecast = JSON.parse(raw);
} catch (e) {
  return `Error fetching weather data: ${e}`;
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
  `_Data: Open-Meteo · Powered by KittyPaw_`,
];

return lines.join("\n");
