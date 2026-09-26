import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function readJsonDirectory(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  return fs.readdirSync(directory)
    .filter(name => name.endsWith('.json'))
    .sort()
    .map(name => readJson(path.join(directory, name)));
}

export function readLogs() {
  const directory = path.join(root, 'src/logs');
  return fs.readdirSync(directory)
    .filter(name => name.endsWith('.jsonl'))
    .sort()
    .flatMap(name => fs.readFileSync(path.join(directory, name), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line)));
}

export function loadSources() {
  return {
    meta: readJson(path.join(root, 'src/meta.json')),
    gates: readJsonDirectory('src/gates'),
    tasks: readJsonDirectory('src/tasks'),
    questions: readJsonDirectory('src/questions'),
    approvals: readJsonDirectory('src/approvals'),
    receipts: readJsonDirectory('src/receipts'),
    log: readLogs()
  };
}

export function publicBoard(sources) {
  return {
    updated: sources.meta.updated,
    gates: sources.gates.map(({ id, name, due, status }) => ({ id, name, due, status })),
    tasks: sources.tasks.map(({ id, owner, title, gate, status, blocked_on, receipt_ref, summary, updated }) => ({
      id, owner, title, gate, status, blocked_on, receipt_ref,
      receipt_url: receipt_ref ? `/receipts/${receipt_ref}.html` : '',
      summary, updated
    })),
    questions: sources.questions.map(({ id, from, for: recipient, text, status, answer }) => ({
      id, from, for: recipient, text, status, answer
    })),
    log: [...sources.log]
      .sort((a, b) => a.ts.localeCompare(b.ts))
      .slice(-30)
  };
}
