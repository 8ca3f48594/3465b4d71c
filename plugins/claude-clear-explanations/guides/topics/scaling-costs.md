# Scaling and operating costs

## Scope

Explain capacity, bottlenecks, demand, and usage-based cost.

## Prerequisites and distinctions

Identify the limiting resource, billing unit, and time period. Separate cost per unit from total workload cost.

## Teaching sequence

State assumptions, calculate one concrete workload, and explain what changes as demand grows.

## Common misconceptions

Adding instances does not remove a shared bottleneck. A unit price is not a complete bill; included allowances and other charges matter.

## Example 1

For an illustrative price of 2 currency units per instance-hour, three instances running for four hours cost 3 times 4 times 2, or 24 units for compute. Storage and transfer charges are outside this calculation.

## Example 2

If all application instances wait on one saturated database, adding more application instances can increase database demand without increasing completed work. Measure the limiting stage before predicting a scaling gain.

## Analogies and limits

More checkout counters illustrate parallel service capacity only when another shared step is not limiting throughput. The analogy does not establish a cost or latency estimate.

## Sources and review

- [Reference](https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
