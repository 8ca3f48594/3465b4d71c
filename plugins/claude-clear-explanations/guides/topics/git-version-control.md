# Git and version history

## Scope

Explain Git, repositories, commits, staging, branches, merging, conflicts, and
the distinction between local history and a shared remote. Help a reader answer
what Git remembers, which version a commit records, or where an experiment fits
in an existing history. Use the reader's current task to select the next concept.

## Prerequisites and distinctions

Begin with editing a file only when the reader has not established that idea.
Accept a direct statement that they understand saving, commits, or another
concept. Start after that concept. A brief affirmative reply answers the most
recent understanding question; it does not establish knowledge of all of Git.

Distinguish an editor save from a Git commit. In the ordinary staging workflow,
a commit records the prepared snapshot, which can differ from the current file
contents. A repository contains recorded history and other Git data. A branch
is a name pointing to a commit; its pointer advances as commits are made on that
branch. A branch is not a separate copy of every file. Sharing commits is a
separate operation from recording them locally.
Creating a branch and switching to it are distinct actions. State that the
reader switches to the new branch before describing commits made on it. For
file-switching examples, establish that the current changes are committed;
uncommitted changes can carry across a switch or prevent it.
New commits on a single branch keep earlier commits in its history. Additional
branches name separate lines of development; they are not required to retain
the earlier recorded versions.
Explain branches as a convenient way to name and continue different directions.
Earlier commits are still available on a single branch. Ground any comparison
with other ways of working in the actual actions and limitations involved.

## Teaching sequence

For a new reader, follow one digital painting through changes. It begins as an
outline. The reader adds a blue sky and chooses to keep that version. They try
an orange sky, then decide they prefer the earlier one. Connect each step to
preparing and recording a version, inspecting it, or restoring its file contents.
Introduce the word commit after explaining the recorded version.
For an open introduction to Git, finish this version-history example before
expanding into staging, branches, merging, or sharing. Explain those operations
when the reader requests them or needs them for a specific task. A topic's scope
lists available subjects, not a sequence to include in every answer.

Continue using the same painting when the reader asks the next question. If they
already understand commits, begin with the next distinction they requested.
Introduce the purpose of that distinction through the painting before its
storage details. For branches, start with wanting to develop both a daytime
scene and a night scene from the same recorded painting. Explain the branch's
name and which recorded version changes; add pointer terminology only when
the reader needs the implementation.
Explain staging through a prepared version that stays unchanged while the
working drawing changes. Explain branches through separately named lines of
experiments sharing an earlier version. Explain a merge conflict through two
incompatible edits that need a person's decision. For a merge example, state
whether both branches have changed since their shared version. Selecting one
whole image can resolve a conflict; combining parts of two images may require
an image editor. State the real Git behavior
beside each part of the example. Add commands only for an operational question.

Ask one question at a useful stopping point if needed. After confirmation,
advance to the next requested concept. Keep an analogy that is helping; replace
one the reader says is confusing. Use a direct file example if painting adds
unfamiliar ideas. Do not require the painting in every Git answer.

## Common misconceptions

Ordinary Git use does not record every brushstroke or editor save. Recording a
commit locally does not upload it. History is not a substitute for a separate
backup. Git can combine many text edits, but conflicting changes still need
resolution. An image file does not generally support the same line-based merge
as text. Earlier content must remain available for a later restore; avoid a
promise that every discarded change can always be recovered.

## Example 1

Imagine you are painting on a computer. You finish an outline and deliberately
keep that version. Later you add a blue sky and keep another version. Then you
try an orange sky. If you prefer the blue one, the earlier recorded version is
still available to inspect or restore. Git can keep selected versions of files
in this way. Preparing and recording a version is a separate action from saving
your current drawing in its editor. Git calls a recorded snapshot a commit.

## Example 2

Suppose you want to keep developing a daytime painting and also try a night
scene. Git branches let you give these two directions separate names. Start with
the recorded daytime version. Create a night-scene branch and switch to it.
Darken the sky and commit the change. The night-scene branch now has that new
version; the daytime branch still has the recorded version you started with.
Once your changes are committed, you can switch back to the daytime branch and
continue that idea separately. Both directions started with the same painting.

## Analogies and limits

Photographs of a painting can explain selected snapshots. Map the current
painting to working files, a deliberately prepared photograph to the staged
snapshot, and recording it with a note to a commit. Later brushstrokes do not
change a photograph already prepared. Preparing the newer picture corresponds
to staging the newer content before committing it.

Use the photograph comparison to explain history, not Git's physical storage.
A Git commit can describe a project's tracked files, not just one drawing. Git
can share stored content across snapshots. A photograph cannot undo spilled
paint on a physical canvas; restoring recorded digital file contents is the
Git operation. Neither a branch nor an image guarantees automatic merging.

## Sources and review

- [Git's snapshot model](https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F).
- [Recording prepared changes](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository).
- [Branches as movable pointers](https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell).

Sources accessed 2026-09-16. Instructions and examples are original. The painting
scenario follows the user's suggestion and Git's documented snapshot model.
Author checked; independent technical and editorial review completed against
the listed Git sources and Git's binary merge documentation; outcome evaluation pending.
