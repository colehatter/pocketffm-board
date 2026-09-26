import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib.mjs';

const ignored = new Set(['.git', 'node_modules']);
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else files.push(file);
  }
}
walk(root);

const tokenPatterns = [
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bvcp_[A-Za-z0-9]{20,}\b/g,
  /\bdpl_[A-Za-z0-9]{8,}\b/g,
  /\bAKIA[A-Z0-9]{16}\b/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /(?:api[_-]?key|access[_-]?token|client[_-]?secret|password|beta[_-]?code)\s*[:=]\s*["']?[A-Za-z0-9_./+-]{12,}/gi
];
const internalPathPatterns = [
  new RegExp('/' + 'Users' + '/[^\\s"\']+', 'g'),
  new RegExp('/' + 'root' + '/[^\\s"\']+', 'g'),
  /\b(?:10|127|169\.254|172\.(?:1[6-9]|2\d|3[01])|192\.168)(?:\.\d{1,3}){2}\b/g
];
const findings = [];
for (const file of files) {
  const relative = path.relative(root, file);
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of [...tokenPatterns, ...internalPathPatterns]) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) findings.push(`${relative}: ${match[0].slice(0, 80)}`);
  }
  if (!relative.endsWith('scan-public.mjs') && /"receipt_path"\s*:/.test(text)) findings.push(`${relative}: forbidden receipt_path property`);
}
if (findings.length) {
  console.error(`PUBLIC SCAN FAILED (${findings.length} findings)`);
  for (const finding of findings) console.error(finding);
  process.exit(1);
}
console.log(`PUBLIC SCAN PASS: ${files.length} files checked, 0 findings`);

