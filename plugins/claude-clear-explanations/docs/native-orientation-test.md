# Native orientation check

Date: 2026-09-21. Scope: Jackson's recorded teaching complaint that a Git
explanation lacked an introduction and made the subject hard to identify.

Claude Code 2.1.273 from the pinned Agent SDK linux binary was present. Plugin
validation passed: `claude plugin validate . --strict`.

A print-mode skill call used `--plugin-dir .`, `--strict-mcp-config`, allowed
tools Read and Skill, and the prompt `/clear-explanations:explain Explain Git.`
It returned `Not logged in · Please run /login` with zero tokens and
`duration_api_ms: 0`. This VM has no Claude Pro login. Native live answers
are blocked on that login, not on `ANTHROPIC_API_KEY`.

No live native answer was scored. Offline checks on this revision:

- `Explain Git.` packet: 2525 bytes, slices `git-purpose` + `git-commits`,
  first instruction is to name the subject and its purpose.
- Stated-knowledge prompt omits the commit slice and keeps `git-purpose` +
  `git-branches` (2807 bytes).
- Codex ideal Git introduction passes the recorded criteria and does not
  block.
- A painting excerpt that never names Git is blocked as
  `git-opening-hides-subject`.

This is not a Sep 16 skip-guides retest. The last native round that did have
login already reported successful guide reads.
