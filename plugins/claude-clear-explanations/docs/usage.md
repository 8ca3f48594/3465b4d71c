# Clear Explanations plugin

This Claude Code plugin combines an always-on output style, an explanation
skill, and a conservative deterministic Stop hook.

## Install from GitHub

Claude Code and Node.js 20 or later must both be on `PATH`. The plugin
hooks run Node; Claude Code's installer does not provide that runtime.

This repository is a plugin marketplace. Add it from GitHub, then install
the plugin. Claude Code requires `plugin@marketplace`; both names are
hashes. No zip. No `--plugin-dir`.

```bash
claude plugin marketplace add 8ca3f48594/3465b4d71c
claude plugin install c90373deff@a2e76ac3fa
```

Inside Claude Code:

```text
/plugin marketplace add 8ca3f48594/3465b4d71c
/plugin install c90373deff@a2e76ac3fa
```

A local checkout can still load the plugin folder for development:

```powershell
claude --version
node --version
claude --plugin-dir .\plugins\claude-clear-explanations
```

The output style applies when the plugin is enabled. Because it uses
`force-for-plugin: true`, it overrides the output style selected in Claude Code.
If several enabled plugins force a style, Claude Code uses the first one it
loads. Invoke the deeper workflow explicitly with:

```text
/c90373deff:explain Why is this await inside the loop?
```

The plugin `name` is `c90373deff`. The skill folder is still `explain`,
so the slash command is `/c90373deff:explain`, not `/explain` and not
`/clear-explanations:explain`.

The skill injects a teaching packet with a UserPromptSubmit hook. Claude Code
2.1.277 ignores YAML hook `args`, so both skill hooks are a single `command`
string (`node "${CLAUDE_PLUGIN_ROOT}/scripts/inject-guides.mjs"` and the
matching checker path). The script resolves guides from its own file location
and inlines matching slices. The model is instructed to use that packet rather
than Reading plugin paths. The Stop hook substitution is for the hook process,
not for model file reads. The separate SDK runner is a different product: it
needs `ANTHROPIC_API_KEY`, does not reuse a Claude Code login, loads guides
itself, and withholds answers until review.

Use `/hooks` after invoking the skill to confirm that the skill contributed one
`Stop` hook. The hook checks explanation responses for canned openings, heading overload,
generic follow-up offers, authored em dashes, Git misconceptions, and AI-ism
phrases. If it blocks, Claude receives exact repair instructions. After at most one revision,
the answer stands unless the rewrite still skips the asked subject. Live and offline agree.

## Run local checks

```powershell
node --test .\plugins\claude-clear-explanations\tests\*.test.mjs
Get-Content -Raw .\response.txt | node .\plugins\claude-clear-explanations\scripts\check-explanation.mjs --analyze
claude plugin validate .\plugins\claude-clear-explanations --strict
```

The checker writes JSON only. Its spans use JavaScript UTF-16 code-unit offsets,
which match `String.prototype.slice` and editor integrations that use UTF-16.

## Scope

The checker detects surface patterns, recorded Git misconceptions, and a small
set of AI-ism phrases:

- canned validation or greeting at the start;
- four or more top-level non-empty ATX headings outside
  top-level fenced code blocks;
- a generic offer to continue at the end;
- an em dash in authored prose;
- documented Git false claims, including recording every edit, overwriting
  earlier committed versions, automatic image merges, treating an editor save as
  a commit, treating branches as required to keep history, creating a branch
  without switching onto it, and Git teaching that never names Git in the
  opening paragraph;
- process narration, throat-clearing filler, signposted recaps, and later-topic
  menus;
- a closer that names later topics after the example's result;
- an opening that says only what the subject is for, not what it is;
- a numbered story that starts after only the subject definition, before
  the example terms are defined (a term list before the numbers is the
  walkthrough, not a jump);
- an opening that states the example's result before the subject and
  the analog mapping are in;
- an opening that leads with an analog when the kind or mapping is
  later;
- an opening that defines a term that is not the thing the question
  asked about, when that asked subject appears later;
- an opening that uses a term before saying what kind of thing it is in
  this setting;
- a sentence that deleting it would not remove a fact, cause, limit, or
  example result, including a colon sentence that only points at the
  next sentence, a label that only names the subject after a copula, or a
  line that only announces that something matters, that another term
  is coming, or that terms are coming (a lone emphasized role word used
  as walkthrough chrome is not this class);
- a demonstrative whose noun is already in play but never named;
- a defined term the example never uses;
- a mapped analog whose first use is term (the analog) before a
  mapping sentence, a later bare use after that mapping exists, a
  pairing supplied by an injected slice with no mapping sentence, a
  later use that shortens the analog noun phrase, or a later use
  that drops the, or writes that, when the analog is a noun phrase
  (term's (the analog's) is the same pair);

One authored em dash, one Git misconception, one AI-ism phrase, one empty
setup sentence, one numbered story before the example terms are defined, one
later-topic dump after the example's result, one opening that uses a term
before saying what kind of thing it is, or one generic
offer to continue is enough to request a repair. A canned opening and heading
overload still block when they form a cluster. For the em-dash rule, the
checker protects top-level fenced blocks, indented code, blockquotes, inline code
with matching backtick delimiters, and straight or curly single- or double-quoted
text within a paragraph. Apostrophes in ordinary words are not opening quotation
marks. These are syntax-based protections, not
proof that a quotation is exact or external. The other rules retain their
top-level fenced-code masking. The checker never claims that a response is correct, high quality,
human-written, or AI-written. Use the rubric and blinded human comparison for
those judgments.

The general guidance says what the subject is, then what it does, when the
reader's knowledge is unknown. It introduces prerequisites before the mechanism
and uses a few plain-language starting points for substantial explanations. The reviewer is
instructed to flag unexplained prerequisite terms and skipped reasoning. A
specific question about where the reader got lost is allowed; a generic offer
to continue is not useful evidence that the explanation worked.

## Reviewed explanation runner

The separate runner holds all model output until the final answer passes its
checks. It uses two general guides, six methods, and 32 topic guides. The native
interactive skill remains available. Its Stop hook can ask for one revision.
After that, the answer stands unless the rewrite still skips the asked subject.

The runner first persists an accepted candidate as pending, with no answer in
the result field. It checks cancellation after that write, then commits the
final result atomically. Cancellation is honored until this finalization begins;
once finalization starts, the decision is fixed. A failed final write leaves the
pending record outside accepted history and produces an audit failure notice.
Candidate evidence stays in the private audit for diagnosis. Review sheets keep
the supplied audience description so reviewers can judge the intended level.

The initial 30 topics are retained. A focused Git guide was added after the Git
evaluation showed a routing gap. Its index description covers repositories,
commits, staging, branches, merging, and conflicts. Runtime Git answers receive
only the matching slices of that guide (purpose, commits, staging, branches, or
merges), not the whole file. A deterministic router selects method and topic IDs
from the question; the model may add to that list within the existing caps. The
runner validates those IDs and loads the files. There is no vector index or
embedding service.

Explicit statements of understanding set the starting point. The native skill
uses the conversation to interpret a brief confirmation. The CLI accepts one
request at a time: put relevant established knowledge in `audience` or `question`
when continuing an earlier explanation. It does not maintain a learner profile
or reconstruct an earlier conversation. A useful example or simile should stay
connected to each new concept, with its mapping and limits made clear.

From this plugin directory, install the locked dependencies:

```powershell
npm.cmd ci --ignore-scripts
```

The locked Agent SDK includes the platform runtime. Node.js 20 or later is
required. The tested Windows runtime is Claude Code 2.1.273 through Agent SDK
0.3.273. The CLI does not need a separate global `claude` command. Windows hosts
may also need Git for Windows; check the SDK setup requirements for the host.

Use the approved environment or secret manager to supply `ANTHROPIC_API_KEY`.
This runner does not load `.env` files or reuse an interactive Claude login.
Do not put a credential in a request, source, example, or command argument.

Create a UTF-8 request JSON file in a private working directory. Replace the
placeholders with your actual question and source path:

```json
{
  "question": "<your actual question>",
  "audience": "<reader background, optional>",
  "sources": [{"id": "source-1", "path": "source.txt"}],
  "draft": "<existing explanation, omit to generate a draft>"
}
```

Each source uses either `path` or `text`. Paths resolve from the request file's
directory. IDs must be unique. An existing draft is optional. Sources stay
unchanged; the reviewer receives the same source text as the writer. The model
has no tools for acquiring missing evidence, and should report that limitation.

Set the model and total estimated spending limit explicitly:

```powershell
npm.cmd run explain -- --request .artifacts/request.json --model MODEL_ID --budget-usd 1 --json
```

The numeric value is an example spending limit, not a price estimate. Choose a
limit for the run. Optional arguments are `--verify-model MODEL_ID`,
`--audit-dir PATH`, `--timeout-ms MILLISECONDS`, `--max-prompt-bytes BYTES`, and
`--general-only`. Use `node scripts/explain.mjs` directly when a consumer needs
stdout to contain only JSON, without npm's command preamble.

The default per-call timeout is 120 seconds. The whole pipeline has a ten-minute
deadline. The initial rewrite can receive two repair attempts. Each call gets
the remaining estimated budget. SDK limits are checked between model operations;
they are not a hard billing cap. The runner records a reported overrun and
withholds the answer. A failed call with unavailable accounting records an
unknown total plus the known subtotal, rather than zero cost.

The 120,000-byte default prompt limit is a transport-size guard, not a tokenizer
measurement. Oversized input is rejected without truncation. The provider's
model-specific context limit can reject a smaller request as well.

Output status is `accepted` or `failed`; only an accepted result has `answer`.
Both results include `guideIds`, safe finding codes, and an `auditId` when a run
was started. Exit status is 0 for acceptance/help and 1 for failure. Raw model
errors and rejected text never appear in terminal output. SIGINT or SIGTERM
cancels the run. A failed audit write also prevents release.

## Audit and evidence limits

Runs default to `.artifacts/runs/<auditId>/run.json`, which Git ignores. The audit
contains full source material, drafts, prompts, selections, corrections, reviews,
model identities, cost estimates, and timing. These files are local plaintext;
use an access-controlled directory for private material. Environment variables
and credentials are not added to audit records. Audit hashes identify content
but are not signatures or proof against deliberate modification.

The checker looks for a small set of exact patterns and repeated structures.
Contextual findings require explicit reviewer decisions. The model reviewer also
checks document structure, vague claims, examples, repetition, and evidence.
Neither check proves authorship or universal factual truth. Mocked regression
tests prove the control flow, not the quality of a live Claude judgment.

The last 20 accepted records in an audit directory supply exact-sentence reuse
observations. This is a limited boilerplate check, not a semantic similarity
model. A contextual review can approve necessary repetition.

Live SDK runs still require `ANTHROPIC_API_KEY`. Without it, use the fixture
replay in `quality/sdk-fixtures/`, `quality/explanation-cases.json`, and
`npm run eval:preference` to prepare blinded human packets. Set
`LIVE_CLAUDE_SDK_TEST=1` with the key to enable the skipped live client test.
The plugin campaign dry-run is
`node ../research/explanation-pipelines/scripts/run-plugin-campaign.mjs --cases ../research/explanation-pipelines/cases/development.json --dry-run`
from this package, or the `campaign:plugin` script in the research package.

The adapter isolates each call from user/project settings, local plugins,
automatic memory, MCP servers, and tools. Managed host policy can still apply.
Each call starts a fresh session. Sources and guidance are data supplied by the
runner; a model has no editing or shell permission in this workflow.

## Compare explanations on real cases

Use real cases you supply. Keep a development set for guide changes and a
separate evaluation set. Do not treat the synthetic plumbing tests as a writing
benchmark. For a matched comparison, supply the same original `draft`, question,
audience, sources, model choices, and library version to both runs:

```powershell
node scripts/explain.mjs --request .artifacts/request.json --model MODEL_ID --budget-usd 1 --general-only --audit-dir .artifacts/general --json
node scripts/explain.mjs --request .artifacts/request.json --model MODEL_ID --budget-usd 1 --audit-dir .artifacts/guided --json
```

Use separate, initially empty directories so one condition does not become the
other condition's repetition history. The general condition supplies an empty
routing index and only the two general guides. It retains a routing call to
hold the call structure constant. The original condition is the supplied draft;
it is not an extra generation or a claim that the draft passed verification.

Create a case manifest with `cases`, an array of objects containing `id`,
`original`, `generalRun`, and `guidedRun`. The last two fields point to their
`run.json` files, relative to the manifest. Then run:

```powershell
npm.cmd run eval:prepare -- .artifacts/cases.json .artifacts/comparison-1
```

The output directory must be new. `blind-review.json` contains randomized A/B/C
labels, the question and evidence, and empty fields for preference, clarity,
useful detail, factual defects, and notes. `private-key.json` maps labels back
to conditions and records acceptance, first-pass acceptance, latency, cost, and
model choices. Keep that key away from the reviewer until scoring is complete.
Failed candidates remain failures in the metrics and expose no draft in the
review sheet. The tool does not choose a winner or invent a passing threshold.

## Development checks

```powershell
npm.cmd test
npm.cmd run check
npm.cmd run check:prompts
npm.cmd run eval:checker
```

`check` parses all source, script, and test modules with Node. `check:prompts`
checks the guide index, guide prose, stage instructions, assembled instruction
packages, skill entry, and output style. Findings require review; a clean scan
does not establish a quality improvement. The library includes 60 original
examples. Its independent content review was bounded; human outcome evaluation
and a paid SDK smoke test remain separate prerequisites for a quality claim.
