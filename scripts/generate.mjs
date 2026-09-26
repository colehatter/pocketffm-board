import fs from 'node:fs';
import path from 'node:path';
import { loadSources, publicBoard, root } from './lib.mjs';

const board = publicBoard(loadSources());
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));
const label = value => String(value).replaceAll('-', ' ');

const blocked = board.tasks.filter(task => task.status === 'blocked');
const openQuestions = board.questions.filter(question => question.status === 'open');
const taskGroups = board.gates.map(gate => {
  const tasks = board.tasks.filter(task => task.gate === gate.id);
  const owners = [...new Set(tasks.map(task => task.owner))];
  return `<section class="gate"><header><div><span class="eyebrow">${escapeHtml(gate.id)}</span><h2>${escapeHtml(gate.name)}</h2></div><div class="gate-meta"><span class="status ${escapeHtml(gate.status)}">${escapeHtml(label(gate.status))}</span><time>${escapeHtml(gate.due)}</time></div></header>${owners.map(owner => `<div class="owner"><h3>${escapeHtml(label(owner))}</h3>${tasks.filter(task => task.owner === owner).map(task => `<article class="task"><div class="task-line"><strong>${escapeHtml(task.id)} · ${escapeHtml(task.title)}</strong><span class="status ${escapeHtml(task.status)}">${escapeHtml(label(task.status))}</span></div><p>${escapeHtml(task.summary)}</p>${task.receipt_ref ? `<small>Receipt: <a href="${escapeHtml(task.receipt_url)}">${escapeHtml(task.receipt_ref)}</a></small>` : ''}</article>`).join('')}</div>`).join('')}</section>`;
}).join('');

const alerts = `<section class="alerts"><h2>Attention required</h2>${blocked.length === 0 && openQuestions.length === 0 ? '<p class="clear">No blocked tasks or open questions.</p>' : ''}${blocked.map(task => `<article><strong>${escapeHtml(task.id)} blocked</strong><p>${escapeHtml(task.blocked_on)}</p></article>`).join('')}${openQuestions.map(question => `<article><strong>${escapeHtml(question.id)} for ${escapeHtml(label(question.for))}</strong><p>${escapeHtml(question.text)}</p></article>`).join('')}</section>`;
const logs = board.log.slice().reverse().map(entry => `<li><time>${escapeHtml(entry.ts)}</time><strong>${escapeHtml(label(entry.who))}</strong><span>${escapeHtml(entry.what)}</span></li>`).join('');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Launch Coordination Board</title><style>
:root{color-scheme:dark;--bg:#0b0e12;--panel:#141922;--line:#29303c;--text:#f5f7fb;--muted:#9aa5b4;--accent:#ffb21a;--red:#ff5f67;--green:#54d39a;--blue:#69a7ff}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{width:min(1120px,calc(100% - 32px));margin:0 auto;padding:42px 0 72px}.top{display:flex;justify-content:space-between;gap:24px;align-items:end;margin-bottom:28px}.eyebrow{color:var(--accent);font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1,h2,h3,p{margin-top:0}h1{font-size:clamp(30px,5vw,52px);line-height:1.02;margin-bottom:10px}.updated{color:var(--muted);text-align:right}.alerts,.gate,.activity{border:1px solid var(--line);background:var(--panel);border-radius:14px;padding:20px;margin-top:18px}.alerts{border-color:#653139}.alerts h2{color:#ff9aa0}.alerts .clear{color:var(--green);margin:0}.gate header{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line);padding-bottom:14px}.gate h2{margin:3px 0 0}.gate-meta{display:flex;gap:12px;align-items:center}.gate-meta time,.task small,.activity time{color:var(--muted)}.owner{margin-top:18px}.owner h3{text-transform:capitalize;color:var(--muted);font-size:13px;letter-spacing:.08em}.task{padding:14px 0;border-top:1px solid var(--line)}.task:first-of-type{border-top:0}.task-line{display:flex;justify-content:space-between;gap:16px}.task p{color:#c9d1dc;margin:7px 0}.status{border:1px solid var(--line);border-radius:999px;padding:3px 9px;font-size:11px;text-transform:uppercase;white-space:nowrap}.status.done,.status.verified,.status.passed{color:var(--green)}.status.blocked,.status.failed{color:var(--red)}.status.in-progress,.status.ready{color:var(--blue)}.activity ul{list-style:none;padding:0;margin:0}.activity li{display:grid;grid-template-columns:170px 110px 1fr;gap:12px;padding:9px 0;border-top:1px solid var(--line)}.activity li:first-child{border-top:0}@media(max-width:700px){.top,.gate header,.task-line{align-items:flex-start;flex-direction:column}.updated{text-align:left}.activity li{grid-template-columns:1fr;gap:2px}}
</style></head><body><main><header class="top"><div><span class="eyebrow">Static public mirror</span><h1>Launch Coordination Board</h1><p>Sanitized gate, task, question, and verification status.</p></div><div class="updated">Updated<br><strong>${escapeHtml(board.updated)}</strong></div></header>${alerts}${taskGroups}<section class="activity"><h2>Latest activity</h2><ul>${logs}</ul></section></main></body></html>`;

const json = `${JSON.stringify(board, null, 2)}\n`;
fs.writeFileSync(path.join(root, 'board.json'), json);
fs.writeFileSync(path.join(root, 'index.html'), html);
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'board.json'), json);
fs.writeFileSync(path.join(dist, 'index.html'), html);
const receiptDirectory = path.join(root, 'receipts');
const distReceiptDirectory = path.join(dist, 'receipts');
fs.mkdirSync(receiptDirectory, { recursive: true });
fs.mkdirSync(distReceiptDirectory, { recursive: true });
for (const receipt of loadSources().receipts) {
  const evidence = receipt.evidence.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const receiptHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(receipt.title)}</title><style>body{max-width:820px;margin:40px auto;padding:0 20px;background:#0b0e12;color:#f5f7fb;font:16px/1.6 system-ui,sans-serif}a{color:#ffb21a}.card{background:#141922;border:1px solid #29303c;border-radius:14px;padding:24px}.result{font-weight:800;text-transform:uppercase}</style></head><body><p><a href="/">Back to board</a></p><main class="card"><h1>${escapeHtml(receipt.title)}</h1><p class="result">${escapeHtml(receipt.result)}</p><p>${escapeHtml(receipt.summary)}</p><h2>Evidence</h2><ul>${evidence}</ul>${receipt.limitations ? `<h2>Limitations</h2><p>${escapeHtml(receipt.limitations)}</p>` : ''}</main></body></html>`;
  fs.writeFileSync(path.join(receiptDirectory, `${receipt.id}.html`), receiptHtml);
  fs.writeFileSync(path.join(distReceiptDirectory, `${receipt.id}.html`), receiptHtml);
}
console.log(`GENERATED: ${board.gates.length} gates, ${board.tasks.length} tasks, ${board.log.length} recent log entries`);
