# Design evidence and limits

Last reviewed: 2026-09-14.

This skill targets a repeated mismatch reported by some Claude users: answers
can contain a large amount of narration and formatting while burying the term,
number, cause, or decision the reader requested. The reports are directional
evidence, not prevalence estimates.

## Strongest observed failure clusters

- Direct questions receive codebase recap before the definition or numerical
  comparison.
- Purpose, mechanism, trivia, and caveats receive equal visual weight.
- Canned validation substitutes for independent technical judgment.
- Code comments restate the next line or preserve chat and implementation
  history.
- Headings, bold labels, summaries, and generic follow-up offers make short
  answers resemble reports.
- Dense invented labels and abbreviations make explanations harder to decode.
- Completion language outruns test or tool evidence.

## Product implications

Claude Code's output-style feature is the correct always-on layer for response
shape. A skill supplies the deeper workflow only when an explanation is needed.
A deterministic Stop hook catches a small set of high-confidence surface
failures and requests at most one revision. The checker does not attempt to
decide whether prose is human or technically correct.

The system must not optimize for shortness alone. Users also report that terse
status summaries can hide decisions and that detailed explanations help with
learning, audits, unfamiliar systems, and risky changes. One heading, contrast,
list, or conversational acknowledgment can be appropriate. The relevant defect
is a repeated or misplaced pattern that obstructs the requested understanding.

## Sources

- [Anthropic: Output styles](https://code.claude.com/docs/en/output-styles)
- [Anthropic: Extend Claude with skills](https://code.claude.com/docs/en/skills)
- [Anthropic: Hooks reference](https://code.claude.com/docs/en/hooks)
- [Anthropic: Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- [Claude Code issue #29769: answer buried behind codebase recap](https://github.com/anthropics/claude-code/issues/29769)
- [Claude Code issue #3382: automatic agreement after a leading prompt](https://github.com/anthropics/claude-code/issues/3382)
- [Claude Code issue #6450: custom output style not reliably followed](https://github.com/anthropics/claude-code/issues/6450)
- [Hacker News discussion: some users value Claude's detail](https://news.ycombinator.com/item?id=34424525)
- [Reddit discussion: code comments that narrate old or obvious behavior](https://www.reddit.com/r/ClaudeAI/comments/1vplvx3/claude_code_writing_much_longer_comments_lately/)
- [Reddit discussion: dense code comments and PR descriptions](https://www.reddit.com/r/ClaudeCode/comments/1wfjrgi/has_anyone_gotten_claude_to_write_code_commentspr/)

Public issue and forum reports do not isolate model, harness, prompt, or user
configuration. Re-run model and human evaluations after material Claude Code or
model updates.
