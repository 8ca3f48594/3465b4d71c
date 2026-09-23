# Beginner Git explanation test

The user supplied the topic Git after requesting more basic explanations,
reader-selected starting points, and a rule against em dashes. The initial
test prompt was `/clear-explanations:explain Explain Git.` No audience level
was included, so it tested the unknown-knowledge default.

Claude Code 2.1.273 used the existing Claude Pro login and reported model
`claude-sonnet-5`. Only Read and Skill were available. The test did not modify
repository files or run Git commands.

## Observed behavior

| Call | Result | API-equivalent estimate | Duration |
| --- | --- | --- | --- |
| Initial question | Too advanced; factual overstatements | USD 0.1070692 | 39.113 seconds |
| Specific confusion feedback | More basic; repetitive questions and overstatements | USD 0.0392240 | 37.908 seconds |
| Targeted repair | Short conceptual introduction; one understanding question | USD 0.0275632 | 12.176 seconds |

The total reported estimate was USD 0.1738564. This is not a statement of
additional subscription charges. Per-call limits were USD 0.30, 0.20, and 0.15.

The first call read both general guides, the index, and the definition method.
It made several unsuccessful path guesses before reading the right files. It
used general guidance without selecting an unrelated topic. The Stop hook found
three authored em dashes and requested a repair. The final answer contained no
em dashes. This is live evidence that the new punctuation rule requests a repair.

The initial explanation nevertheless moved quickly into staging, commands, and
branches. It said every change was recorded and overstated protection against
collaboration conflicts. The first follow-up was written by the agent to test
recovery from specified confusion, not supplied by the user as a personal
knowledge statement. It identified the unfamiliar terms and asked for a simpler
explanation. Claude then repeated understanding questions after each section and
made broad claims about permanence and recovering versions.

The final corrective prompt requested one familiar file example and one useful
question. It also identified the factual overstatements. The resulting answer
describes editing `story.txt`, saving it normally, and choosing to record a
version with Git. It ends by asking about the distinction between saving and
recording. Independent review found no material factual error for this
introductory purpose. Some repetition remains. It is not an operational tutorial.

The follow-ups resumed the same conversation. They do not establish how a fresh
session would use every later instruction edit. Neither follow-up registered a
new Stop hook; both final answers passed the local checker afterward. Three
successful API calls are not three successful first-attempt explanations.

## Evidence and limits

The raw events and final text are gitignored under `.artifacts/git-beginner/`,
`.artifacts/git-beginner-followup/`, and `.artifacts/git-beginner-repair/`.
They preserve the unsuccessful answers and the corrective prompts.

Factual spot-checks used the official Pro Git sections on
[version control](https://git-scm.com/book/en/v2/Getting-Started-About-Version-Control),
[Git's model](https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F), and
[branches](https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell),
accessed on 2026-09-16. These sources informed review; their full text was not
added to the runtime instruction package.

This is one qualitative case with agent feedback. It does not demonstrate a
general quality improvement or replace user judgment. The separate final-only
runner still needs its configured API credential for a live test.

## Local checks

The new punctuation regression first failed, then passed after enforcement was
added. Independent review found protected-code and performance defects; both
received failing tests before fixes. The final suite passed all 118 tests.
Syntax checks passed for 28 modules; prompt scans had no findings; the existing
32-case checker evaluation passed. Native plugin validation and a package dry
run passed. No type-check, formatter, build command, or ship-check skill is
provided for this package.

The first live launch attempt failed before a model call because the installed
executable had been renamed to an update-backup file. An offline `npm ci` failed
on a locked backup. An offline install restored the pinned runtime; the old
locked backup remains in ignored dependencies. One local report command had a
syntax error and was corrected. These were tooling failures, not model results.
