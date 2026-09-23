# Git framework feedback test

Date: 2026-09-16. The user authorized another live test and offered feedback.
The test reused the earlier constructed audience statement: understanding saving
and commits, with a digital painting example, asking what branches add. This
does not assert the user's actual knowledge. The original question was unchanged.

Native Claude Code used `sonnet`, resolved as `claude-sonnet-5`, through the
existing Pro login. Read and Skill were the only model tools. Restricted mode,
an empty setting-source list, and strict MCP configuration were enabled. The
prompt limited reads to the explanation plugin. Raw events and requests remain
gitignored in `.artifacts/git-framework-feedback/`.

## Results

| Attempt | Outcome | API-equivalent estimate | Provider-reported duration |
| --- | --- | --- | --- |
| Initial | Three guide reads failed because Claude resolved paths from the repository root. It then incorrectly promised automatic merging of painting files. Withheld. | USD 0.0754798 | 23.860 seconds |
| Repair | Correct absolute paths supplied in the same conversation. It read both general guides, the index, and the Git guide successfully. No method guide was read. It corrected automatic image merging but omitted switching to the created branch before committing. | USD 0.0658354 | 13.938 seconds |

Total estimate: USD 0.1413152, within the USD 0.15 cap. These are API-equivalent
usage estimates, not confirmed subscription charges. The repair's cap used the
remaining allowance rounded down to USD 0.074. No further paid call was made.

The native Stop hook completed on the initial call. Local style scans found no
configured violations in either final candidate. This did not establish factual
correctness. The full repaired answer is not accepted unchanged.

## Independent review and displayed excerpt

An independent agent checked the repaired answer against the Git guide and
official Git documentation. Creating a branch does not select it, so the next
commit's branch must be explicit. Codex added a clause saying to switch to
`night-scene` before editing and committing. The unmodified candidate and exact
manual correction remain separate audit records.

The reviewer also found that the later merge paragraph needed clearer conditions:
both branches must change the image differently for the illustrated need to
combine their content. Selecting one whole version can resolve an image conflict;
an image editor is needed when combining parts. That paragraph is withheld from
the feedback excerpt, rather than presented as factually accepted.

The displayed excerpt contains the first three paragraphs and the disclosed
branch-selection clarification. Its wording is otherwise unchanged. The local
style scan of that excerpt also returned no findings. The excerpt was presented
for user feedback. This is feedback on a reviewed excerpt, not a successful
automatic draft-to-display workflow or proof of a prompt improvement.

The user then reported that the excerpt lacked an introduction and made it hard
to identify what was being explained. General guidance now distinguishes known
prerequisites from orientation to a new concept. The definition method, native
skill, output style, and review rubric now allow a brief purpose and familiar
situation before a formal definition. This prompt change has not had a new live
Claude test. A proposed opening written by Codex is a separate illustration, not
a new Claude result or an accepted improvement.

After this instruction update, `npm.cmd run check:prompts` reported no findings
and `npm.cmd test` passed all 120 tests. These checks do not measure whether the
new opening guidance resolves the user's confusion.

Sources used for factual review:

- [Branches in a Nutshell](https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell).
- [Git attributes and merge drivers](https://git-scm.com/docs/gitattributes).

## Runtime issues

The managed native executable was missing again. It was restored from a cached
tarball after comparing its SHA-512 integrity with the package lock. The repair
launch later found the managed path missing again, before a model call. It then
used the extracted, verified executable directly. Automatic updates were disabled
for these processes. No existing interactive processes or global settings changed.

The native relative-path loading failure remains unresolved. Supplying absolute
paths repaired this test but is not a durable plugin fix. The separate SDK runner
loads guides itself; this test did not exercise that runner or its release gate.
