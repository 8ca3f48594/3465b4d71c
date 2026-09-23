# Evaluation harness without a live key

The explanation-quality corpus is `quality/explanation-cases.json`. It stores the
Git questions, expected slices, rubric criteria, Codex ideal samples, and
reconstructed native defects. `quality/checker-cases.json` now includes those
Git defects as blocking checker cases.

Blinded preference packets come from `quality/preference-pairs.json`:

```powershell
npm.cmd run eval:preference
```

The output directory is new under `.artifacts/preference`. `blind-review.json`
hides condition names. `private-key.json` maps labels back. Preference fields
stay empty until a human fills them.

SDK replay without Anthropic:

- `quality/sdk-fixtures/git-invalid-review.json` is the 2026-09-17 invented
  style-ID review.
- `tests/native-routing.test.mjs` also proves a reviewer-approved overwrite
  claim is still withheld.

A live SDK call stays skipped unless both `ANTHROPIC_API_KEY` and
`LIVE_CLAUDE_SDK_TEST=1` are set. Do not put a key in the repo.
