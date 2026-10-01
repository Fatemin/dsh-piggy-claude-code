# Piggy Companion Agent Entry

> `AGENTS.md` points here. These are repository rules, not a platform system prompt.
> Keep authorization, critical safeguards, and routing here; load methods and commands from [`docs/agent/`](docs/agent/README.md) on demand.
> Adapted from the business-agnostic part of the RIMINA OPS harness (snapshot in [`harness/`](harness/MANIFEST.md), read-only reference).

## 1. Intent and communication

- Communicate with the user in Chinese unless asked otherwise. Keep identifiers, commands, filenames and quoted evidence unchanged. Keep one authority per rule. Persist decisions, constraints, open questions, evidence and next actions, not full chains of thought.
- Classify tasks as review, diagnosis, design, implementation, or release. State goals, scope, non-goals and high-risk actions; never extend authorization across them.
- Reviews and diagnoses default to read-only; edit only when requested. Push, publishing and releases need explicit authorization for this task.
- Preserve the user's and other sessions' uncommitted files, branches and worktrees. Other Claude sessions edit this repo concurrently: check `git status` and the current branch first, touch only your own files, stop on unclear ownership, never clean up.
- Use current code, relevant tests, recent commits and worktree state as evidence. Memory or old documents' task status and test counts do not prove current state.

## 2. Critical safeguards

1. **Stage only this task's exact paths.** Never `git add .`, `git add -A` or `git commit -a`. Run `git diff --check` and `git diff --cached --check` before committing; after the commit `git status --porcelain` must show none of your files.
2. **Isolated work for concurrent tasks.** When another session has uncommitted work on the same files, implement in a worktree on `feature/<name>` created from committed local `main` (`git worktree add ../wt-<name> -b feature/<name> main`) instead of sharing the directory.
3. **Local `main` awaits acceptance.** Verify, commit exact changes, merge into local `main`, then stop. Merging authorizes neither push nor release. Retain the feature branch/worktree until the user accepts.
4. **Remote updates are separate.** Push `origin/main` only on an explicit push request. If `origin/main` has commits missing locally, stop and integrate them; never force-push, never `--no-verify`.
5. **No destructive shortcuts.** No `git reset --hard`, `git checkout -- .`, `git clean`, `git worktree remove --force`, or branch deletion without looking at the target and getting explicit approval.
6. **Never conflate** local commit, merge, push and release as "done". Report each layer separately.
7. **Restart after merge.** After every local commit/merge, restart the Electron desktop app (`app/` `npm start`) so it runs the merged result (user's standing rule).

## 3. Task routing

Start with the read-only diagnostic:

```bash
node scripts/harness/doctor.mjs --json
```

| Task | Primary entry |
|---|---|
| Design, art, sprites, gameplay rules | [`docs/DESIGN.md`](docs/DESIGN.md), [`docs/ART-SPEC.md`](docs/ART-SPEC.md), [`docs/PROCESS.md`](docs/PROCESS.md) |
| Tests, commits, branches, worktrees, merges | [`docs/agent/delivery.md`](docs/agent/delivery.md) |
| Rule maintenance, information ownership | [`docs/agent/README.md`](docs/agent/README.md) |

Use `rg` from these entries to find current implementation and tests. Doctor is diagnostic, never proof of passing tests. Warnings are not gate passes.

## 4. Execution and stopping boundaries

- Edit only in-scope files. Coordinate shared entries (`client.js`, `core.js`, `data.js`, `index.js`, locales) before concurrent edits; never absorb others' WIP.
- **Test consent applies to every client.** Ask only before the complete test suite (`npm test`, bare `node --test`, or `node --test "test/**/*.test.js"`). Targeted runs (`node --test test/core.test.js`, `--test-name-pattern`), builds, lint/syntax checks, whitespace checks and read-only queries do not need it. Existing approval covers its stated scope; skipped tests remain unverified. Enforced by [`scripts/harness/claude-test-consent.mjs`](scripts/harness/claude-test-consent.mjs) via `.claude/settings.json`.
- Ordinary development verifies only the affected parts: directly changed modules + their dependents and shared contracts (`core.js` rules, `data.js` tables, `locales/`, store format). State assessed impact and actual tests run. Failure is failure; unverified is not passed.
- On errors give root-cause evidence, safe retry and stop conditions. Stop affected actions for missing outcome-changing user choices, unknown overlapping edits, remote ahead, or failed tests.

## 5. Result contract

Final reports include `status` (`success` / `warning` / `error`), `summary` (one sentence), `next_actions` (acceptance, retry, or stop reason) and `artifacts` (files, branches, SHA, verification counts).

Development completion replies use three Chinese paragraphs:

1. **模块**: changed modules.
2. **功能与内容**: changes, assessed impact, and actual verification scope.
3. **合入状态**: whether merged into local `main`; state blockers if not. Report remote status separately.

For user confirmation give the conclusion and recommendation first, then brief situation, conflict, key choice and alternatives. Avoid process logs.

## 6. Maintenance boundaries

Follow [information ownership](docs/agent/README.md#information-ownership): this file owns stable global rules; `docs/agent/` owns methods; memory owns preferences and experience; harness scripts own mechanical conditions. Prefer a test or narrow command to a new prose rule; do not duplicate procedures across entries.
