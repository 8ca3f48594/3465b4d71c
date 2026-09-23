# Observability and incidents

## Scope

Explain logs, metrics, traces, incident evidence, and operational diagnosis.

## Prerequisites and distinctions

Identify the time range, service, and signal. Separate an observation from a proposed cause.

## Teaching sequence

Start with user impact, connect signals along one request path, and name the next check that could reject the hypothesis.

## Common misconceptions

A correlation in time does not establish a cause. Missing telemetry may mean missing instrumentation rather than no failure.

## Example 1

A metric can show a rise in request duration across a period. A trace can show the timed operations within one instrumented request. These views answer different questions and can be used together.

## Example 2

If a trace shows most request time in a database span, the span narrows the investigation. It does not alone establish whether the database query, connection wait, or another included operation caused the delay.

## Analogies and limits

Use a request timeline directly. It makes evidence gaps visible without assigning human intent to a service.

## Sources and review

- [Reference](https://opentelemetry.io/docs/concepts/signals/), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
