// reminder/main.js
// Deterministic reminder manager.
// Natural-language understanding belongs to the engine/LLM caller, which must
// pass structured params:
//   {action:"add", text:"buy groceries"}
//   {action:"list"}
//   {action:"done", id:1}
//   {action:"clear"}

const ctx = JSON.parse(__context__);
const params = ctx.params || {};

const STORAGE_KEY = "reminders";

async function loadReminders() {
  try {
    const raw = await Storage.get(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const value = parsed.value !== undefined ? parsed.value : parsed;
    return typeof value === "string" ? JSON.parse(value) : (value || []);
  } catch (e) {
    return [];
  }
}

async function saveReminders(reminders) {
  await Storage.set(STORAGE_KEY, JSON.stringify(reminders));
}

function nextId(reminders) {
  if (reminders.length === 0) return 1;
  return Math.max(...reminders.map(r => r.id)) + 1;
}

function formatList(reminders) {
  const active = reminders.filter(r => !r.done);
  const done = reminders.filter(r => r.done);
  if (reminders.length === 0) return "저장된 리마인더가 없습니다.";

  const lines = ["📋 리마인더\n"];
  if (active.length > 0) {
    lines.push("진행 중:");
    active.forEach(r => lines.push(`  [${r.id}] ${r.text}  (${r.createdAt})`));
  }
  if (done.length > 0) {
    lines.push("\n완료:");
    done.forEach(r => lines.push(`  [${r.id}] ✓ ${r.text}`));
  }
  return lines.join("\n");
}

function normalizedAction(value) {
  const action = String(value || "").trim().toLowerCase();
  if (action === "create") return "add";
  if (action === "complete") return "done";
  return action;
}

const action = normalizedAction(params.action);
let reminders = await loadReminders();

if (action === "list") {
  return formatList(reminders);
}

if (action === "clear") {
  const before = reminders.length;
  reminders = reminders.filter(r => !r.done);
  await saveReminders(reminders);
  const removed = before - reminders.length;
  return `완료된 리마인더 ${removed}개를 정리했습니다. 진행 중 ${reminders.length}개가 남아 있습니다.`;
}

if (action === "done") {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return "완료 처리할 리마인더 id가 필요합니다.";
  }
  const idx = reminders.findIndex(r => r.id === id);
  if (idx === -1) return `#${id} 리마인더를 찾지 못했습니다.`;
  reminders[idx].done = true;
  await saveReminders(reminders);
  return `✅ #${id} 완료 처리했습니다: "${reminders[idx].text}"`;
}

if (action === "add") {
  const text = String(params.text || "").trim();
  if (!text) return "추가할 리마인더 내용이 필요합니다.";
  const newReminder = {
    id: nextId(reminders),
    text,
    done: false,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  reminders.push(newReminder);
  await saveReminders(reminders);
  return `✏️ #${newReminder.id} 리마인더를 저장했습니다: "${text}"`;
}

return "리마인더 작업을 실행하려면 action 파라미터가 필요합니다. 가능한 action: add, list, done, clear.";
