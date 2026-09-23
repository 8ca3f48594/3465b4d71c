# Algorithms and data structures

## Scope

Choose and explain a data structure or algorithm for a concrete operation.

## Prerequisites and distinctions

Identify the input size, required ordering, and operations. Separate an abstract operation from a language's implementation.

## Teaching sequence

Walk a small input through the operation. Then explain how the work grows as the input grows. Use a trace before asymptotic notation for beginners.

## Common misconceptions

Separate average behavior from worst-case bounds. Include the cost of building an index when comparing repeated lookups.

## Example 1

A stack returns the most recently added item first. After pushing A and then B, the next pop returns B. This ordering is useful when undoing the most recent action.

## Example 2

Removing the first element from a Python list shifts the remaining elements. A deque supports removal at either end without that list-wide shift, so it fits a queue that repeatedly removes its oldest item.

## Analogies and limits

A stack of trays maps the top tray to the next item removed. The analogy explains order; it does not predict allocation cost or thread safety.

## Sources and review

- [Reference](https://docs.python.org/3/tutorial/datastructures.html), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
