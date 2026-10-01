# On-demand Agent Runbooks

`CLAUDE.md` is the only always-loaded entry; this page is the second-hop router. Load only the context the task needs.

| Task | Primary entry |
|---|---|
| Tests, commits, branches, worktrees, merges | [`delivery.md`](delivery.md) |
| Design, art, gameplay | [`../DESIGN.md`](../DESIGN.md), [`../ART-SPEC.md`](../ART-SPEC.md), [`../PROCESS.md`](../PROCESS.md) |

<a id="information-ownership"></a>

## Information ownership

- Global authorization and critical safeguards: `CLAUDE.md`.
- Delivery methods: [`delivery.md`](delivery.md).
- Current features: root `README*.md`; history: `CHANGELOG.md`.
- Implementation facts: current code and tests.
- Temporary decisions and task progress: the task itself or commit messages; not repository rules.
- Memory: stable user preferences and pitfalls hard to derive from code. For rules covered by an authority, keep a short reminder and link. One-time authorization is not permanent permission; historical status is not current fact.
- Harness (`scripts/harness/`): mechanically decidable constraints and evidence from the current run. It does not own preferences or semantic acceptance.

Before adding a rule, consider a test, static check or harness enforcement. If implementation differs from an approved rule, record the gap rather than treating current behavior as the rule.
