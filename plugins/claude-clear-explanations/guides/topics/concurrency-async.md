# Concurrency and async behavior

## Scope

Explain waiting, scheduling, concurrent tasks, races, and cancellation.

## Prerequisites and distinctions

Identify the runtime and what suspends execution. Separate concurrency from simultaneous execution on multiple cores.

## Teaching sequence

Trace two operations on a timeline. Mark where each operation waits and what can run during that interval. Then explain shared-state access.

## Common misconceptions

An async function can still perform blocking work. Awaiting operations one after another does not by itself schedule them concurrently.

## Example 1

A coroutine is an object a function call builds but does not run. Awaiting that object runs it in the current task. create_task is a separate task the event loop can switch to during a wait.

## Example 2

If two tasks each read a counter before either writes an increment, both may compute the same new value. The lost increment follows from that interleaving. Show the read and write steps before introducing a lock.

## Analogies and limits

One cook can switch to another dish while water heats. This maps waiting to task switching, but does not imply that a single thread performs two CPU instructions at once.

## Sources and review

- [Reference](https://docs.python.org/3/library/asyncio-task.html), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
