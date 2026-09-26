import { pathToFileURL } from 'node:url';
import { loadSources } from './lib.mjs';

const OWNERS = new Set(['iron-man', 'jarvis', 'wonder-woman', 'claude', 'cole']);
const TASK_STATUSES = new Set(['todo', 'in-progress', 'done', 'verified', 'blocked']);
const GATE_STATUSES = new Set(['open', 'ready', 'passed', 'failed']);
const QUESTION_RECIPIENTS = new Set(['iron-man', 'claude', 'cole']);
const QUESTION_STATUSES = new Set(['open', 'answered', 'closed']);
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function unique(records, label) {
  const ids = new Set();
  for (const record of records) {
    assert(record.id && !ids.has(record.id), `${label} has a missing or duplicate id: ${record.id || '(missing)'}`);
    ids.add(record.id);
  }
}

export function validateSources(sources) {
  assert(ISO.test(sources.meta.updated), 'src/meta.json updated must be UTC ISO 8601');
  unique(sources.gates, 'gates');
  unique(sources.tasks, 'tasks');
  unique(sources.questions, 'questions');
  unique(sources.receipts, 'receipts');

  const gateIds = new Set(sources.gates.map(gate => gate.id));
  const approvals = new Map(sources.approvals.map(approval => [approval.gate, approval]));
  const receiptRefs = new Set(sources.receipts.map(receipt => receipt.id));

  for (const receipt of sources.receipts) {
    assert(/^[a-z0-9-]+$/.test(receipt.id), `${receipt.id} has an invalid receipt id`);
    assert(receipt.title && receipt.result && receipt.summary, `${receipt.id} is incomplete`);
    assert(Array.isArray(receipt.evidence) && receipt.evidence.length, `${receipt.id} requires evidence`);
  }

  for (const gate of sources.gates) {
    assert(/^G\d+$/.test(gate.id), `${gate.id} has an invalid gate id`);
    assert(gate.name && DATE.test(gate.due), `${gate.id} requires a name and YYYY-MM-DD due date`);
    assert(GATE_STATUSES.has(gate.status), `${gate.id} has invalid status ${gate.status}`);
    if (gate.status === 'passed' || gate.status === 'failed') {
      const approval = approvals.get(gate.id);
      assert(approval, `${gate.id} cannot be ${gate.status} without src/approvals/${gate.id}.json`);
      assert(DATE.test(approval.date), `${gate.id} approval requires a valid date`);
      assert(approval.approval_text && approval.approval_text.trim(), `${gate.id} approval requires Cole's exact approval text`);
      assert(approval.committed_by === 'iron-man', `${gate.id} approval must be committed by iron-man`);
    }
  }

  for (const task of sources.tasks) {
    assert(/^T-\d{3}$/.test(task.id), `${task.id} has an invalid task id`);
    assert(OWNERS.has(task.owner), `${task.id} has invalid owner ${task.owner}`);
    assert(OWNERS.has(task.verifier), `${task.id} has invalid verifier ${task.verifier}`);
    assert(task.owner !== task.verifier, `${task.id} cannot be self-verified`);
    assert(gateIds.has(task.gate), `${task.id} references unknown gate ${task.gate}`);
    assert(TASK_STATUSES.has(task.status), `${task.id} has invalid status ${task.status}`);
    assert(task.title && task.summary && ISO.test(task.updated), `${task.id} is missing required content`);
    assert(task.status !== 'blocked' || task.blocked_on, `${task.id} is blocked without blocked_on`);
    assert(!['done', 'verified'].includes(task.status) || task.receipt_ref, `${task.id} ${task.status} requires receipt_ref`);
    assert(!task.receipt_ref || receiptRefs.has(task.receipt_ref), `${task.id} references missing receipt ${task.receipt_ref}`);
    if (task.owner === 'iron-man') assert(task.verifier === 'jarvis', `${task.id} must be verified by jarvis`);
    if (task.owner === 'jarvis' || task.owner === 'wonder-woman') assert(task.verifier === 'iron-man', `${task.id} must be verified by iron-man`);
    const expectedLog = `${task.id} ${task.status}:`;
    assert(sources.log.some(entry => entry.ts === task.updated && entry.what.startsWith(expectedLog)), `${task.id} requires a matching status log entry`);
  }

  for (const question of sources.questions) {
    assert(/^Q-\d{3}$/.test(question.id), `${question.id} has an invalid question id`);
    assert(OWNERS.has(question.from), `${question.id} has invalid sender`);
    assert(QUESTION_RECIPIENTS.has(question.for), `${question.id} has invalid recipient`);
    assert(QUESTION_STATUSES.has(question.status), `${question.id} has invalid status`);
    assert(question.text && typeof question.answer === 'string', `${question.id} is incomplete`);
  }

  for (const entry of sources.log) {
    assert(ISO.test(entry.ts), 'log entry has invalid timestamp');
    assert(OWNERS.has(entry.who), `log entry has invalid actor ${entry.who}`);
    assert(entry.what && entry.what.length <= 180, 'log entry must be one short line');
  }

  const latest = [...sources.tasks.map(task => task.updated), ...sources.log.map(entry => entry.ts)].sort().at(-1);
  assert(sources.meta.updated === latest, 'top-level updated must equal the latest task or log timestamp');
  return true;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const sources = loadSources();
    validateSources(sources);
    console.log(`VALID: ${sources.gates.length} gates, ${sources.tasks.length} tasks, ${sources.questions.length} questions, ${sources.log.length} log entries`);
  } catch (error) {
    console.error(`INVALID: ${error.message}`);
    process.exit(1);
  }
}
