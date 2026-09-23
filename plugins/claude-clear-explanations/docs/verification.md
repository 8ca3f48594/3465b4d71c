# Implementation verification

Last verification: 2026-09-17. Earlier dated sections retain their historical results.

The latest bounded improvement round is recorded in
[iteration-review.md](iteration-review.md), including failed live candidates.

## Implemented scope

The plugin contains two general guides, six method guides, 31 topic guides, and
62 original topic examples. The Node runner controls drafting, routing,
rewriting, contextual review, retries, and terminal delivery. A separate CLI
prepares blinded comparisons from existing real-case run records.

The existing interactive skill and one-revision Stop hook remain available.
They do not provide the runner's final-only delivery behavior.

## Test-driven changes

The runner, SDK adapter, library/style loader, CLI, comparison tool, and review
fixes each have recorded failing tests followed by passing unchanged tests.
The RED records contain the exact test snapshots, commands, status, and failure
evidence. Initial scaffolds imported correctly but supplied no feature behavior.
The CLI history fixture was corrected before implementation because a short
factual sentence should not trigger the twelve-word reuse rule; that correction
and a second RED run are recorded.

- Runner: repository `docs/red-runner.md`.
- Adapter: `red-client.md`.
- Library and style: `red-library-style.md`.
- CLI: `red-cli.md`.
- Comparison: `red-comparison.md`.
- Integration fixes: `red-integration-review.md`.
- Independent review fixes: `red-reviewer.md`.
- Audit cancellation and comparison audience: `red-audit-cancellation.md`.

The first real-library slice used both general guides, one method, and the
programming/types topic with mocked model responses. It completed draft,
rewrite, and verification before the remaining 29 topics were authored.

## Commands and results

Run these from `plugins/claude-clear-explanations`:

| Command | Result |
| --- | --- |
| `npm.cmd test` | 125 tests passed; zero failed. Model calls use injected fixtures. |
| `npm.cmd run check` | Node syntax checks passed for 31 source, script, and test modules. |
| `npm.cmd run check:prompts` | 31 topics, six methods, zero deterministic findings. |
| `npm.cmd run eval:checker` | All 32 existing checker corpus cases passed. |
| `npm.cmd pack --dry-run --json --ignore-scripts --cache .artifacts/npm-cache` | Package inspection succeeded; no package was published. |
| Bundled `claude.exe --version` | Claude Code 2.1.273. |
| Bundled `claude.exe plugin validate . --strict` | Validation passed. |

Agent SDK 0.3.273 is locked in `package-lock.json` and imports successfully.
The native platform runtime is installed. The adapter options were checked
against the installed SDK declarations, including environment replacement,
disabled tools, isolated settings, and structured output.

`git diff --check` passed for tracked changes. The plugin was untracked when
work started. Final staging is limited to the plugin, its research records,
and the README link. Local model transcripts and dependencies remain ignored.

The `ship-check` skill is not installed in the available skill directory.
The plugin has no separate type-check, formatter, or compilation/build command;
its JavaScript runs directly in Node. Native tests, syntax checks, prompt
checks, checker corpus evaluation, and plugin/package validation were used.

The first dependency-install attempt failed with sandbox EACCES. The approved
retry used a local ignored npm cache and disabled lifecycle scripts; it succeeded.
One review-test command used a repository-relative path from the plugin working
directory and failed to locate the file. It was rerun with the correct path and
all three review regressions passed. Neither event was a product test failure.

## Independent review

An independent agent inspected the core modules and all 30 topic guides. It
found a disagreement about blocking style resolutions, loss of reported costs
on SDK budget errors, and a guide sentence that omitted tool permissions.
All three findings were corrected. Regression tests cover the two behavior
changes. The main integration review also added late-cancellation, incomplete
cost, resolved-model, correction-evidence, and library-integrity checks.

The content review was bounded. It included ten source-page checks, not a full
independent reproduction of every cited paper or every guide example.

The beginner-guidance update added an authored em-dash rule. An independent
review found valid code spans that were incorrectly flagged and slow scanning
of unmatched quotation marks. Both received failing regressions before fixes.
See `red-em-dash.md`, `red-protected-punctuation.md`, and
`red-prose-performance.md`. The final independent check passed all 31 new cases.
The native examples and rubric were updated to agree with the beginner guidance
and punctuation policy. Counterexamples were moved outside the runtime package.

The later Git-specific guide received independent technical and editorial
review. The routing test failed before that guide existed, then passed after
the index and file were added; see `red-git-guidance.md`. It also checks that
the reader's stated knowledge reaches each model stage unchanged. The initial
30-topic limit was expanded by one in response to the user's specific request
and the demonstrated Git routing gap. No classifier or vector service was added.

## Not yet verified

The initial general-framework update changed Markdown instructions and authoring
documentation only. The root repository records its sources in
`docs/explanation-framework-research.md` and its repeatable research process in
`docs/explanation-authoring-workflow.md`. Research collections remain outside the
runtime package. Existing topic coverage is unchanged by this update.

Validation on 2026-09-16 used these commands from the plugin directory:

- `npm.cmd test`: all 120 tests passed.
- `npm.cmd run check`: all 29 JavaScript files passed syntax checks.
- `npm.cmd run check:prompts`: zero findings across 31 topics, six methods, and
  the other authored prompt components. Library hash:
  `53ff66d9eb7174e25a8168ed49573368d0bcebdd1986a84ccf01bb977e7cfff3`.
- `npm.cmd run eval:checker`: all 32 declared cases passed.
- `./node_modules/@anthropic-ai/claude-agent-sdk-win32-x64/claude.exe plugin validate . --strict`:
  passed with `DISABLE_AUTOUPDATER=1` set for that process environment.
- `npm.cmd pack --dry-run --json --ignore-scripts --cache .artifacts/npm-cache`:
  passed; 92 files, with no audit artifacts, dependencies, or new research records
  in the package. npm reported its existing fallback to `.gitignore` exclusions.
- `git diff --check`: passed. The plugin remains untracked in the current working
  tree, so changed content also received direct inspection.

The repository has no formatter, type-check, or build command. `ship-check` is
unavailable. Native checks above were used directly. No TDD claim is made for
this declarative instruction update. No live Claude call was made for it, and
the checks do not establish better explanations or improved learning.

An independent reviewer inspected the changed runtime guidance and the two
research documents. It checked source fidelity for the four analogy papers and
found that some access notes overstated how much of each paper had been read.
Those notes now distinguish access to full text from inspection of relevant
sections. The reviewer found no further actionable issue in its assigned scope.
It did not independently verify the other sources or evaluate live answers.

The first two native Claude Code plugin calls used an existing Claude Pro login.
See [the live test report](native-smoke-test.md). Both calls completed and ran
the Stop hook. They found inconsistent guide loading and incorrect examples.
The user's Git question was then tested with two corrective follow-ups; see
[the beginner test report](git-beginner-test.md). The em-dash hook repaired a
live answer, but basic teaching quality still required explicit coaching.
The later [explicit-understanding test](git-known-understanding-test.md) loaded
the new Git guide and continued the painting example without reteaching commits.
It still made a material factual error about preserving history on one branch.
The failed answer remains in the audit. A source-checked guide clarification
was added afterward; its effect on a new live answer is unverified.

The separate final-only SDK runner has not completed a live test.
`ANTHROPIC_API_KEY` was checked for presence only and is not configured. That
runner still needs the credential through the approved environment mechanism,
an explicit model ID, and a spending limit. Its exact live interaction between
tool disabling and structured output has not been exercised against the provider.

The user supplied one topic, Git, for a live qualitative check. A representative
evaluation corpus is still absent. No blinded preference outcome,
quality gain, first-pass acceptance rate, or factual error rate is claimed.
The comparison tool records these outcomes when real runs and human judgments
are available. A clean prompt scan is a limited rule result, not proof that all
possible AI writing patterns are absent.

Costs are SDK estimates rather than billing statements. Budget enforcement can
stop subsequent operations and withhold an over-budget answer; it cannot undo
already incurred provider charges. Unknown cost remains explicitly unknown.
