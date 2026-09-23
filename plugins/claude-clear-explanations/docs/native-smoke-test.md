# Native Claude Code plugin test

Date: 2026-09-16.

Claude Code 2.1.273 used the existing Claude Pro login. The requested model alias
was `sonnet`; the runtime reported `claude-sonnet-5`. The user approved sending
the explanation plugin instructions, selected guides, style module, and relevant
runner code to Anthropic. No API key was read or recorded.

The test invoked `/clear-explanations:explain` and asked why `src/style.mjs`
masks code and quotations, and why a style finding does not always block an
answer. The model could use only Read and Skill. It could not modify files.
The plugin was loaded with `--plugin-dir`; external MCP configuration was
excluded with `--strict-mcp-config`.

| Check | First run | Second run |
| --- | --- | --- |
| Provider result | Success | Success |
| Stop hook | Exit 0, success | Exit 0, success |
| General guides read | Neither | Both |
| Routing index read | Yes | No |
| Selected guides read | Causal explanation; architecture and design | None |
| Runtime duration | 62.851 seconds | 70.440 seconds |
| Reported API-equivalent cost | USD 0.2309746 | USD 0.1864420 |
| Configured per-run limit | USD 0.75 | USD 0.50 |

Total reported API-equivalent usage was USD 0.4174166. These values are provider
estimates, not a statement of charges to the subscription account.

After the first run, the skill instructions were changed to require both general
guides before drafting, followed by the index and selected guides. The second
run loaded both general guides but skipped the index. This is evidence that
native skill instructions do not guarantee the complete routing sequence. The
separate runner loads validated selections in code; it was not tested live here.

The first answer described a generic closing offer as an unconditional rejection,
but the detector matches a narrower terminal question pattern. Independent review
confirmed that the example offer produced no finding. The second answer claimed
that `isRevolutionary` would trigger `inflated-importance`; the rule does not match
that identifier. The explanation also described syntactic masking as if it could
determine authorship. These claims are not supported by the implementation.

Both Stop hooks passed despite the factual defects. The native hook checks a
limited set of surface patterns. It does not perform the separate factual review
specified for the final-only runner. These runs do not establish output quality
improvement or factual acceptance.

The complete local events are gitignored under `.artifacts/native-smoke/` and
`.artifacts/native-smoke-retest/`. The second answer is also stored as
`.artifacts/native-smoke-retest/answer.md`. The completed second session was
opened in a separate Claude Code terminal for inspection.

After the instruction change, `npm.cmd test` passed all 87 tests,
`npm.cmd run check:prompts` reported no findings, and `npm.cmd run eval:checker`
passed all 32 cases. A direct prompt-mode check of the changed SKILL.md reported
no findings. Native plugin validation passed. Only instructions and this test
record changed; production JavaScript was not changed during this test.
