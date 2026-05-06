import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

function tomlString(body, key) {
  const match = body.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m"));
  return match ? match[1] : "";
}

function configBlocks(body) {
  return [...body.matchAll(/\[\[config\.fields\]\]([\s\S]*?)(?=\n\[\[|\n\[|$)/g)].map((m) => m[1]);
}

function configKeys(body) {
  return configBlocks(body).map((block) => tomlString(block, "key")).filter(Boolean);
}

async function loadIndex() {
  return JSON.parse(await readFile("index.json", "utf8"));
}

async function packageDirs() {
  const entries = await readdir("packages", { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function testPublicIndexMatchesPackageMetadata() {
  const index = await loadIndex();
  for (const entry of index.packages) {
    const packagePath = join("packages", entry.id, "package.toml");
    await stat(packagePath);
    const body = await readFile(packagePath, "utf8");
    assert.equal(entry.name, tomlString(body, "name"), `${entry.id}: index/package name mismatch`);
    assert.equal(entry.version, tomlString(body, "version"), `${entry.id}: index/package version mismatch`);
    assert.equal(entry.category, tomlString(body, "category"), `${entry.id}: index/package category mismatch`);
  }
}

async function testNoPackageOnlyDeadPublicSkills() {
  const index = await loadIndex();
  const publicIDs = new Set(index.packages.map((entry) => entry.id));
  assert.ok(!publicIDs.has("lotto-check"), "lotto-check must stay hidden until its upstream API works again");

  for (const id of await packageDirs()) {
    if (id === "lotto-check") continue;
    assert.ok(publicIDs.has(id), `${id}: package dir exists but is not public`);
  }
}

async function testScheduledPublicPackagesDeclareTelegramDeliveryConfig() {
  const index = await loadIndex();
  for (const entry of index.packages) {
    const body = await readFile(join("packages", entry.id, "package.toml"), "utf8");
    if (!/^\s*type\s*=\s*"schedule"/m.test(body)) continue;
    const keys = configKeys(body);
    assert.ok(keys.includes("telegram_token"), `${entry.id}: scheduled package needs telegram_token config`);
    assert.ok(keys.includes("chat_id"), `${entry.id}: scheduled package needs chat_id config`);
  }
}

async function testConfigDefaultsAreStrings() {
  for (const id of await packageDirs()) {
    const body = await readFile(join("packages", id, "package.toml"), "utf8");
    const badDefault = body
      .split("\n")
      .find((line) => /^\s*default\s*=/.test(line) && !line.split("=").slice(1).join("=").trimStart().startsWith('"'));
    assert.equal(badDefault, undefined, `${id}: config default values must be strings`);
  }
}

await testPublicIndexMatchesPackageMetadata();
await testNoPackageOnlyDeadPublicSkills();
await testScheduledPublicPackagesDeclareTelegramDeliveryConfig();
await testConfigDefaultsAreStrings();
console.log("registry quality tests passed");
