# Bounded improvement round

Date: 2026-09-17. Scope: the user's Git introduction and a constructed follow-up
about branches. The follow-up assumes knowledge of saving and commits and asks
to keep a digital painting example. It does not establish the user's knowledge.

## Changes

The native skill now resolves references from `${CLAUDE_PLUGIN_ROOT}`. It reads
both general guides, the index, and relevant selected guides before drafting.
The missing-guide stop is an instruction, not an enforced delivery gate.

The explanation method now separates a useful introduction from a generic
opening. It starts with the subject's purpose, accepts stated knowledge, and
uses one example to reach a useful result. It keeps hypothetical examples
hypothetical. It makes extra definitions, transfer exercises, and questions
conditional on the reader's need. The Git guide distinguishes creating a
branch from switching to it and states the conditions for its examples.

These choices apply the research recorded in the repository's
`docs/explanation-framework-research.md`. Analogy mappings and worked steps
support explanation design. Their effectiveness in this product remains a
hypothesis. Similes remain available when their relationships are accurate.

The writer now explicitly permits deleting redundant paragraphs while
preserving supported meaning. The reviewer now checks that a claimed
correction is present in the answer, that each paragraph serves this question,
and that style-resolution IDs come from the supplied checker findings.
These are declarative prompt changes; prompt and syntax checks validate their
construction, not their effects on readers.

Independent code review found two separate defects. Audit finalization now
uses a pending record before final acceptance, so cancellation or a failed
final write cannot put an unreleased candidate into accepted history. Blind
comparison records now retain the supplied audience description. Failing
regression tests preceded these code changes. See `red-audit-cancellation.md`.

## Live calls

Claude Code 2.1.273 used the existing signed-in account. The explicit model
alias `sonnet` resolved to `claude-sonnet-5`. Calls used fresh sessions, restricted
mode, isolated settings, and strict MCP configuration. Native skill calls had
only Read and Skill available. Stage calls had no model tools and used the
runner's assembled instructions and JSON schemas through the native CLI.
This tests instruction stages, not the SDK transport end to end.

| Call | Finding | Estimated USD | Provider duration |
| --- | --- | ---: | ---: |
| Branches 1 | Better orientation and correct branch switching; retained extra internals and an unnecessary closing question. | 0.1127104 | 19.710 s |
| Git 1 | Expanded into a glossary and made an excessive claim about recovery of uncommitted work. | 0.0932270 | 27.407 s |
| Branches 2 | Shorter ending; still claimed branches were necessary to keep alternatives and treated an example as reader history. | 0.0986520 | 29.467 s |
| Branches 3 | Still invented prior story details and repeated pointer explanations. | 0.1112818 | 31.228 s |
| Git 2 | Shorter introduction with a hypothetical painting; retained a redundant conclusion and adjacent-topic menu. | 0.0839504 | 16.854 s |
| Rewrite | Claimed to correct the commit qualification but still implied the saved file was the recorded version. Retained the ending. | 0.0551730 | 21.227 s |
| Review 1 | Approved the weak rewrite and invented checker rule IDs. The controller rejected the recorded response as invalid. | 0.0947120 | 67.093 s |
| Review 2 | Updated reviewer instructions; hit the call budget with no usable structured result. | 0.1218980 | 89.466 s |

All five native skill calls read both general guides, the index, the definition
method, and the Git topic. No tool read errors were reported. Each original
request and instruction snapshot remains in the local audit. Later stage calls
record their assembled instructions and exact inputs separately.

Total provider estimate: **USD 0.7716046**. The round target was USD 0.75. The
last call requested a USD 0.095 cap but reported USD 0.121898 before returning
`error_max_budget_usd`. The round exceeded its target by USD 0.0216046. No
further paid calls were made. These are API-equivalent estimates, not billing
statements. Native call limits did not provide a strict incurred-cost ceiling.

An independent editorial reviewer rejected the rewrite for the missing
prepared-snapshot qualification and unnecessary ending. The local controller
also replayed Review 1 with its recorded candidate. It returned
`status: failed`, `reason: invalid-review`, and no answer. Review 2 produced no
usable structured judgment. No candidate from this round is presented as a
fully accepted explanation. The final reviewer wording has not passed a live
review test. The final writer wording changed after the unsuccessful rewrite
and was not retested live in this round.

## Verification and limits

- `npm test`: 125 passed, zero failed.
- `npm run check`: 31 JavaScript files passed syntax checks.
- `npm run check:prompts`: zero findings; 31 topics and six methods.
- `npm run eval:checker`: all 32 checker cases passed.
- `claude.exe plugin validate . --strict`: passed using the pinned runtime.
- `npm pack --dry-run --json --ignore-scripts --cache .artifacts/npm-cache`:
  inspected locally; no publication and no runtime audits or dependencies in
  the package.

Guide library hash:
`add1665626c0add90590bf2b90f2fd0e7e41c4665057cb41dfcee4601803f2fb`.
This hash covers the guide library. Native instruction snapshots also cover
the skill and output style. Raw transcripts remain gitignored under
`.artifacts/iteration-review/`; this report contains no credentials.

The SDK runner still lacks a configured API key for live testing. There is no
representative evaluation corpus or blinded human preference result. This
round found useful defects but does not establish an overall quality gain,
learning benefit, reliable first-pass acceptance, or absence of all AIisms.
The authored em-dash rule and protection of code and quotations remain tested.
The repository has no separate formatter, type-check, or build command.
The `ship-check` skill is unavailable; repository checks were used directly.
