# Devices and embedded systems

## Scope

Explain digital inputs, outputs, timing, resource limits, and interaction with physical devices.

## Prerequisites and distinctions

Identify the board, voltage levels, units, and sensor or actuator. Separate a sampled signal from a physical event.

## Teaching sequence

Trace the physical event through input sampling and program state to the output. State timing assumptions.

## Common misconceptions

A physical switch can produce several transitions during one press. Software should not assume every sampled edge is a separate intentional press.

## Example 1

A mechanical button can briefly alternate between open and closed as its contacts settle. A program that counts each edge may count one press more than once. Debouncing waits for a stable condition before accepting a change.

## Example 2

A delay used for debouncing also delays recognition. The chosen interval trades responsiveness against rejecting contact bounce. Its value depends on the switch and measurement; it is not a universal constant.

## Analogies and limits

Use a timing trace of the sampled input. It shows the repeated transitions and accepted state change more precisely than a metaphor.

## Sources and review

- [Reference](https://docs.arduino.cc/built-in-examples/digital/Debounce/), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
