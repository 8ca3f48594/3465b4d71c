# Physics and simulation

## Scope

Explain simulated motion, collision behavior, fixed timesteps, and approximations.

## Prerequisites and distinctions

Identify units, timestep, body type, and the engine's rules. Separate a mathematical model from its numerical update.

## Teaching sequence

Work one small update by hand, then describe collision handling and the limits of the approximation.

## Common misconceptions

A simulation is not automatically physically exact. Its body type, integration method, collision rules, and timestep affect results.

## Example 1

For constant velocity of 3 meters per second over 0.2 seconds, displacement is 0.6 meters. This calculation assumes the velocity stays constant over that interval; acceleration requires an additional update rule.

## Example 2

Godot provides body types with different movement responsibilities. A RigidBody can be advanced by the physics engine, while a CharacterBody supports movement controlled by code. Explain which body is present before recommending how to move it.

## Analogies and limits

Use a position-and-time diagram. It makes units and timestep assumptions visible without suggesting that an engine reproduces all real-world physics.

## Sources and review

- [Reference](https://docs.godotengine.org/en/stable/tutorials/physics/physics_introduction.html), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
