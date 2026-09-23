# Game design, loops, and state

## Scope

Explain player input, update loops, game state, and visible behavior.

## Prerequisites and distinctions

Identify the game rule, state variables, and timing source. Separate simulation updates from rendered frames.

## Teaching sequence

Trace one player action through a state change to the next visible frame. Introduce timing when it changes the result.

## Common misconceptions

A rendered frame is not necessarily one fixed unit of simulation time. More rendering frames should not implicitly make movement faster.

## Example 1

If a character moves a fixed distance on every rendered frame, a higher frame rate can make it travel farther per second. Multiplying a constant velocity by elapsed time expresses the intended movement in time-based units.

## Example 2

Godot separates per-frame processing from physics processing. Put reasoning about visual updates and physics steps on the appropriate timeline instead of assuming both callbacks run at the same frequency.

## Analogies and limits

A flipbook illustrates rendered frames. It does not explain the separate simulation clock or guarantee physically accurate movement.

## Sources and review

- [Reference](https://docs.godotengine.org/en/stable/tutorials/scripting/idle_and_physics_processing.html), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
