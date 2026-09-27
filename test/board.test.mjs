import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadSources, publicBoard, root } from '../scripts/lib.mjs';
import { validateSources } from '../scripts/validate.mjs';

test('atomic source records pass governance validation', () => {
  assert.equal(validateSources(loadSources()), true);
});

test('self-verification is rejected', () => {
  const sources = structuredClone(loadSources());
  sources.tasks[0].verifier = sources.tasks[0].owner;
  assert.throws(() => validateSources(sources), /cannot be self-verified/);
});

test('passed gates require a Cole approval record', () => {
  const sources = structuredClone(loadSources());
  sources.gates[0].status = 'passed';
  sources.approvals = sources.approvals.filter(approval => approval.gate !== sources.gates[0].id);
  assert.throws(() => validateSources(sources), /without src\/approvals\/G1\.json/);
});

test('generated artifacts are static and match the public schema', () => {
  execFileSync(process.execPath, ['scripts/generate.mjs'], { cwd: root });
  const commitSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const board = JSON.parse(fs.readFileSync(path.join(root, 'board.json'), 'utf8'));
  assert.deepEqual(Object.keys(board), ['updated', 'gates', 'tasks', 'questions', 'log']);
  assert.deepEqual(Object.keys(board.tasks[0]), ['id', 'owner', 'title', 'gate', 'status', 'blocked_on', 'receipt_ref', 'receipt_url', 'summary', 'updated']);
  for (const task of board.tasks.filter(item => item.receipt_ref)) {
    assert.match(task.receipt_url, /^https:\/\/pocketffm-board\.vercel\.app\/receipts\/[a-z0-9-]+\.html$/);
  }
  assert.deepEqual(board, publicBoard(loadSources()));
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /<script\b/i);
  assert.match(html, /Attention required/);
  assert.match(html, /Latest activity/);
  assert.match(html, /href="https:\/\/pocketffm-board\.vercel\.app\/receipts\/closeout-backup-summary\.html"/);
  assert.equal(fs.existsSync(path.join(root, 'receipts', 'closeout-backup-summary.html')), true);
  assert.equal(fs.existsSync(path.join(root, 'orientation-reports', 'T-010', 'orientation-report.json')), true);
  assert.equal(fs.existsSync(path.join(root, 'orientation-reports', 'T-011', 'orientation-report.json')), true);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'dist', 'snapshots', `${commitSha.slice(0, 7)}.json`), 'utf8')), board);
});
