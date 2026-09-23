# Backend services and APIs

## Scope

Explain request handling, API contracts, HTTP semantics, and retries.

## Prerequisites and distinctions

Identify caller, server, method, resource, status, and response content. Separate a transport success from the requested business result.

## Teaching sequence

Trace a concrete request from receipt through validation and response. Introduce status codes or retries when they affect the caller.

## Common misconceptions

Idempotence concerns the intended server effect of repeated requests. It does not require identical response bodies or remove every incidental side effect.

## Example 1

A GET request asks for a representation of a resource. The server can reject it because the caller lacks access; the method alone does not promise a successful response.

## Example 2

PUT is defined as idempotent. Repeating the same request is intended to have the same effect as making it once, even if logs record every attempt. Application behavior must actually honor that contract before a client relies on it.

## Analogies and limits

An order form maps to a request with defined fields. It does not explain authentication, delivery guarantees, or how retries are handled.

## Sources and review

- [Reference](https://datatracker.ietf.org/doc/html/rfc9110), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
