# Programming fundamentals and types

## Scope

Explain values, variables, expressions, control flow, functions, and types. Use
this guide for questions about what a small program means or why an operation
accepts some values and rejects others.

## Prerequisites and distinctions

Establish the language and the concrete value. Distinguish a name from its value,
a type from a representation, and conversion from validation. Separate language
rules from conventions enforced by a checker.

## Teaching sequence

Start with one expression and its result. Identify each value's type and the
operation applied. Trace a variable change only when the question needs it.
For experienced readers, focus on the language rule that explains the result.

## Common misconceptions

Explain when assignment binds a name and when an operation changes a mutable
object. State the language's behavior for mixed types. Show the actual conversion
rule before drawing conclusions from how a value is printed.

## Example 1

In Python, `"2" + "3"` produces the string `"23"`. Both operands are strings,
so `+` concatenates them. `int("2") + int("3")` produces the integer `5` because
the conversions supply numeric operands.

## Example 2

In Python, after `a = [1]` and `b = a`, both names refer to the same list.
`b.append(2)` changes that list, so `a` also refers to `[1, 2]`. Assignment alone
does not copy the list.

## Analogies and limits

A name can be compared with a label attached to an object: two labels can name
one object. This helps explain aliasing. It does not describe memory layout or
establish assignment rules for every language.

## Sources and review

- [Python tutorial, introduction](https://docs.python.org/3/tutorial/introduction.html), Python 3.14.7, accessed 2026-09-16.
- [Python built-in types](https://docs.python.org/3/library/stdtypes.html), Python 3.14.7, accessed 2026-09-16.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
