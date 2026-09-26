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
