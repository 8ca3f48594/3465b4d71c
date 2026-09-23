# Language models and AI tooling

## Scope

Explain prompts, tool calls, structured output, evidence retrieval, and model evaluation.

## Prerequisites and distinctions

Identify the model's inputs, tool permissions, and output contract. Separate generated text from an action performed by a tool.

## Teaching sequence

Trace the input, any tool request, the tool's actual result, and the final answer. State which checks are mechanical and which depend on model judgment.

## Common misconceptions

Valid JSON does not establish factual accuracy. A generated description of an action is not evidence that the action occurred.

## Example 1

A JSON schema can require an answer string and a list of findings. A response can satisfy that structure while containing an unsupported statement, so the application still needs content checks.

## Example 2

The application checks a tool request against its permissions. For an allowed request, it executes the tool and returns the result. A denied request returns a refusal or error. Generating a tool's name does not perform the requested operation.

## Analogies and limits

A form illustrates output structure: required fields can be present even when an entry is wrong. This analogy concerns validation and does not explain how the model generates text.

## Sources and review

- [Reference](https://code.claude.com/docs/en/agent-sdk/structured-outputs), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
