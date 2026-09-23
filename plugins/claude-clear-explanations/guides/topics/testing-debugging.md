# Testing and debugging

## Scope

Explain a failing test, a defect diagnosis, or the evidence needed to validate a fix.

## Prerequisites and distinctions

Identify expected behavior, observed behavior, and the smallest input that separates them. Distinguish assertions from diagnostic output.

## Teaching sequence

Show the failing observation, trace the cause, and name the check that distinguishes the proposed cause from alternatives.

## Common misconceptions

A passing test supports the behavior it checks. It does not establish that every input or environment works.

## Example 1

A test that asserts add(2, 3) equals 5 checks the returned value for that input. Printing 5 lets a person inspect output, but a test runner needs an assertion to report a mismatch automatically.

## Example 2

In pytest, an expected exception can be checked with pytest.raises. A test for rejection of invalid input should check the intended exception type so an unrelated failure does not count as success.

## Analogies and limits

Use the concrete failure and test result directly. A detective analogy adds no precision to an already short causal trace.

## Sources and review

- [Reference](https://docs.pytest.org/en/stable/how-to/assert.html), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
