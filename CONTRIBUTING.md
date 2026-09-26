# Contributing

## Authority

- Builders may set their assigned tasks to `todo`, `in-progress`, `done`, or `blocked`.
- Iron Man is the sole merger and publisher.
- Only Iron Man may set a task to `verified`, and only after the assigned verifier records a passing result.
- Iron Man verifies Jarvis and Wonder Woman tasks.
- Jarvis verifies Iron Man tasks.
- Nobody verifies their own work.
- Cole approves gates only. Task-level decisions belong to Iron Man. Unresolved decisions are parked for the next gate.
- A gate may be marked `passed` or `failed` only after Iron Man commits `src/approvals/GX.json` containing the date and Cole's exact approval text.

## Update protocol

1. Edit only the atomic task, question, approval, or personal log file involved.
2. Append a log entry for every status change.
3. Set the atomic record's `updated` field to the same ISO 8601 timestamp.
4. Update `src/meta.json` with that timestamp.
5. Run `npm test`, `npm run build`, and `npm run scan`.
6. Commit with `T-001 done: one line`, substituting the correct task and status.
7. Submit the commit for Iron Man to review and merge.

## Public-data boundary

Never commit secrets, credentials, access codes, member data, infrastructure addresses, internal filesystem locations, deployment identifiers, raw receipts, private failure output, or personal information. Use a sanitized `receipt_ref`, normally a board-local receipt label or source commit SHA.


## Builder board merge rule

Builder board write keys are repository-wide deploy keys, and branch protection is unavailable on the current plan. Branch scope is therefore enforced at merge time by Iron Man.

- Builders push only to their own board branch: `jarvis/<task-id>` for Jarvis and `wonder-woman/<task-id>` for Wonder Woman.
- Builders never push to `main` or to another builder's branch.
- Iron Man merges a builder commit only if every changed file is one of:
  - that builder's own `src/tasks/T-0xx.json` records
  - that builder's own log (`src/logs/jarvis.jsonl` or `src/logs/wonder-woman.jsonl`)
  - `src/meta.json`
- Any other changed file, including another builder's task or log, generated output, receipts, gates, approvals, or scripts, blocks the merge. Iron Man returns the commit to the builder.
- Before merging, Iron Man checks the changed-file list with `git diff --name-only main...<branch>` and confirms the branch name matches the committing builder.
- Any push to `main` or to another builder's branch from a builder key is an incident. Iron Man reports it to Cole, and that builder's key is revoked until reviewed.
