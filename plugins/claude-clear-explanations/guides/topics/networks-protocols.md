# Networks and protocols

## Scope

Explain connections, message delivery, latency, and protocol layers.

## Prerequisites and distinctions

Identify endpoints, protocol, and the observation available at each layer. Separate transport delivery from application processing.

## Teaching sequence

Trace one message through the relevant layers. Mark delays, retries, and the point at which the application acknowledges work.

## Common misconceptions

Receiving bytes does not prove that a business operation completed. A connection error can leave the caller uncertain about the operation's result.

## Example 1

TCP exposes an ordered byte stream. Two writes by a sender need not become two matching reads at the receiver, so the application needs a way to identify its message boundaries.

## Example 2

A successful transport exchange does not prove that a database update committed. An application response must convey that result; if the response is lost, the caller may need a safe way to check or retry the operation.

## Analogies and limits

A pipe illustrates a stream without built-in message boundaries. It does not represent packet loss, congestion control, or retransmission.

## Sources and review

- [Reference](https://datatracker.ietf.org/doc/html/rfc9293), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
