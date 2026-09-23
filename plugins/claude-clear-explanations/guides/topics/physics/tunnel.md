A physics simulation is a program that predicts how objects move over time,
for example a game or robotics controller tracking a projectile. A fixed
timestep is an equal jump of time used to recalculate each position.

- Timestep (dt): the fixed slice of time each update advances.
- Velocity: how fast the object moves, in meters per second.
- Displacement: distance moved in one timestep.
- Wall: a fixed obstacle the object can collide with.

The object velocity is 100 m/s.
The timestep is 0.0167 s.
Displacement this timestep is 100 m/s × 0.0167 s = 1.667 m.
The wall is 0.1 m thick.

1.667 m is larger than 0.1 m, so the next check is already past the wall.
That miss is tunneling.
