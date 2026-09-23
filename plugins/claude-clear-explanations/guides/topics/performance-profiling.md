# Performance and profiling

## Scope

Explain measurement results, bottlenecks, latency, and proposed optimizations.

## Prerequisites and distinctions

Identify the measured workload and metric. Separate CPU time, wall time, cumulative function time, and call count.

## Teaching sequence

Show the measurement, name the limiting operation, and calculate the maximum effect of the proposed change under explicit assumptions.

## Common misconceptions

A profiler can change timing. A hot function may reflect frequent callers; inspect cumulative and local time before assigning cause.

## Example 1

If a hypothetical run spends 80 milliseconds in one operation and 20 elsewhere, halving that operation gives 40 plus 20, or 60 milliseconds total. The whole run becomes about 1.67 times as fast under those assumptions.

## Example 2

Python cProfile reports call counts and timing information. High cumulative time includes work in called functions; high local time points to work attributed to the function itself. Those columns support different investigations.

## Analogies and limits

Use the measured time breakdown directly. A bottleneck analogy cannot establish which operation dominates the actual workload.

## Sources and review

- [Reference](https://docs.python.org/3/library/profile.html), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
