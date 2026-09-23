# Explicit understanding and a continuing example

Date: 2026-09-16. The agent constructed this continuation test from the user's
request to respect stated knowledge and keep using helpful examples:

> I understand saving a file and making a commit. We were using a digital
> painting example with versions I deliberately kept. Explain what Git branches
> add, keeping that painting example.

This does not assert the user's personal Git knowledge. It invoked the native
explain skill in a fresh conversation. Claude Code 2.1.273 used `sonnet`, resolved
as `claude-sonnet-5`, through the existing Pro login. Model tools were Read and
Skill; the per-call API-equivalent limit was USD 0.15.

## Results

The call completed in 24.748 seconds and reported USD 0.0955484 API-equivalent
usage, not a confirmed additional subscription charge. It read both general
guides, the routing index, and the new `git-version-control` guide. An attempted
project-memory read failed and supplied no file contents. The separate runner
disables model tools; this native skill test does not provide that isolation.

The answer continued with branches without reteaching saving and commits. It
kept the painting example, using blue-sky and night-scene versions. The Stop
hook requested one repair for two em dashes; the final answer contained none.

However, it claimed that a new commit on one branch would overwrite an earlier
committed version. That is false: ordinary new commits retain the preceding
history. This is a pass for the two observed teaching behaviors with a material
factual failure. It is not an accepted explanation or a general quality result.

The guide now states that extra branches are not needed to retain earlier
commits. Independent review checked that correction against Pro Git. This
clarification has not had another live test. The faulty answer remains intact
in gitignored `.artifacts/git-known-understanding/` alongside the raw events.

Local regressions prove that the guide can be selected and loaded, and that
stated audience knowledge reaches writing and review unchanged. They do not
prove semantic routing accuracy or live factual fidelity. The research and
guide review are documented in the repository's `docs/git-teaching-research.md`.

## Runtime notes

The first launch failed before a model call because the executable had again
been renamed to an update-backup file. Restoration used the cached tarball URL
and integrity from the package lock. A package-name lookup failed because its
registry metadata was not cached. One lockfile inspection needed PowerShell's
hash-table JSON mode for the lockfile's empty root key.

The test process set `DISABLE_AUTOUPDATER=1`, following
[Claude Code's documented option](https://code.claude.com/docs/en/setup).
No global setting changed. Older interactive processes may still have their
previous update behavior; their windows were not closed during this test.
