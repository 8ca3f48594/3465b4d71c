# Frontend interfaces and state

## Scope

Explain UI events, state updates, rendering, and displayed results.

## Prerequisites and distinctions

Identify the framework, event handler, state owner, and rendered value. Separate application state from the visible DOM.

## Teaching sequence

Start with what the user sees. Trace an event through state change and the next render. Show one interaction before lifecycle detail.

## Common misconceptions

A state setter does not necessarily change a variable already captured by the running handler. A render does not necessarily imply a changed DOM node.

## Example 1

In React, a handler sees the state snapshot from the render that created it. Calling a state setter requests another render; reading the same captured variable later in that handler still reads the earlier snapshot.

## Example 2

If a React handler calls setCount(count + 1) three times with the same captured count, each call requests the same next value. Updater functions can instead describe successive changes to the queued value.

## Analogies and limits

A snapshot resembles a photograph of one moment. The mapping concerns captured values; React does not create a photograph or copy every application object.

## Sources and review

- [Reference](https://react.dev/learn/state-as-a-snapshot), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
