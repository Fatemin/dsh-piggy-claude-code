# Agent Delivery Runbook

## 1. State model

- Working tree / feature worktree: this task's editing and verification location.
- Local `main`: integration line awaiting user acceptance; may be ahead of the remote.
- `origin/main`: the remote line. Find its address with `git remote get-url origin`. Pushing is a separate, explicitly requested step.

Ordinary development stops after local-`main` integration.

## 2. Start work

```bash
node scripts/harness/doctor.mjs --json
git fetch origin
git rev-list --left-right --count main...origin/main
```

Doctor never fetches or changes anything. Columns are local-only and origin-only commit counts; stop if the second is nonzero.

Other sessions edit this repository at the same time. If `git status` shows uncommitted files you did not create that overlap your scope, work in a worktree:

```bash
git worktree add ../wt-<name> -b feature/<name> main
```

Otherwise working on `main` in place is fine, as long as you touch only your own files. Read-only reviews need no branch.

## 3. Verification

Test consent (see `CLAUDE.md` §4): ask the user only before the complete suite. Use targeted runs by default:

```bash
node --test test/core.test.js
node --test --test-name-pattern "<name>" test/core.test.js
```

The complete suite is `npm test` (equivalently bare `node --test` or `node --test "test/**/*.test.js"`). The Claude Code hook asks for per-call confirmation and denies it in `bypassPermissions`/`dontAsk` modes, where confirmation cannot be obtained.

Impact = directly changed modules + dependents and shared contracts (`core.js`, `data.js`, `locales/`, `store.js`, sprite pipeline `tools/build-sprites.mjs`). Before testing, state changed modules, affected callers, selected tests, and why that scope covers the change. Final reports state assessed impact and actual tests run; unrun checks remain unverified.

On failure: keep the complete error, classify baseline vs. environment vs. current regression, fix the root cause and rerun the affected tests. If it cannot be fixed safely, stop and report; never skip failures to commit.

### 3.1 Execution guard

`scripts/harness/claude-test-consent.mjs` is registered in `.claude/settings.json` for `PreToolUse` (Bash/PowerShell), `SessionStart` and `UserPromptSubmit`. It positively recognizes only the complete suite; unknown commands and targeted runs pass through. It never silently approves, and it is an accidental-bypass guard, not a sandbox. Hooks must not run verification themselves. A new or changed hook only applies to sessions started afterwards.

## 4. Precise commits

```bash
git diff --check
git add <this task's files...>
git diff --cached --check
git status --short
git commit -m "<summary>"
git status --porcelain
```

Never stage other tasks' files or clean up untracked files of unclear ownership. Commit messages use the repo's existing style (`[<session id>] <summary>`).

## 5. Integration into local main

From a feature worktree that is clean and verified:

```bash
git -C <main-checkout> status --short        # main must not overlap incoming paths
git -C <main-checkout> merge --no-ff feature/<name>
```

Check first that `origin/main` is not ahead and that main's dirty paths do not overlap the incoming paths; if they do, stop. A conflict is aborted (`git merge --abort`), not guessed through. Merge success does not prove testing; report verification separately. Then restart the desktop app (`CLAUDE.md` §2.7) and stop for user acceptance; do not push.

## 6. Cleanup

Only after the user accepted, or chose local-only delivery:

```bash
git worktree remove <feature-worktree>
git branch -d feature/<name>
```

Remove worktrees before their branches. If uncommitted files block removal, stop and confirm their destination; never `--force` blindly.

## 7. Result reporting

Report separately: `status`, `summary`, `next_actions`, `artifacts` (feature SHA, local main SHA, remote divergence, tests run). State feature-only, local-main integration and push independently.
