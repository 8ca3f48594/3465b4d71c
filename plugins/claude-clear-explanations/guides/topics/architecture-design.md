# Architecture and design

## Scope

Explain component responsibilities, dependencies, interfaces, and design tradeoffs.

## Prerequisites and distinctions

Identify the current requirement and the boundary being discussed. Distinguish a module, a process, and a deployed service.

## Teaching sequence

Trace one request across the relevant boundary. Explain who owns data and decisions. Compare an alternative using an actual constraint.

## Common misconceptions

A folder split alone does not enforce a boundary. Additional services introduce network and operating costs; separate them only when a requirement justifies the change.

## Example 1

In Python, moving parsing code into a module gives callers a named import. It does not move that code into another process. An ordinary function call still runs in the caller's process.

## Example 2

Consider an application whose storage adapter exposes save and load operations. Callers can use those operations without constructing database queries. Replacing the database still requires checking that the new adapter preserves the expected behavior.

## Analogies and limits

A service counter can represent an interface: callers request an operation without following each internal step. It does not explain network failures or guarantee that the interface stays compatible.

## Sources and review

- [Reference](https://docs.python.org/3/tutorial/modules.html), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
