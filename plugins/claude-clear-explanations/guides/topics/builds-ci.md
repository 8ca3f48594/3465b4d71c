# Builds and CI/CD

## Scope

Explain build inputs, workflow triggers, jobs, tests, artifacts, and deployment gates.

## Prerequisites and distinctions

Identify the source revision and event. Distinguish a workflow, job, step, and artifact.

## Teaching sequence

Trace one change from trigger through checks and produced files. Explain dependencies between jobs before discussing parallel execution.

## Common misconceptions

A successful build does not prove a deployment completed. Tests validate their assertions, not every possible environment.

## Example 1

In GitHub Actions, a workflow runs in response to configured events. Its jobs run on runners; steps within a job run in sequence. A dependency between jobs can require one job to finish before another starts.

## Example 2

A test job and a deployment job have different outcomes. If deployment requires the test job, explain that dependency explicitly. A green test result alone is not evidence that the deployment job ran.

## Analogies and limits

Use the actual workflow graph. A factory analogy can hide the difference between isolated jobs and sequential steps.

## Sources and review

- [Reference](https://docs.github.com/en/actions/get-started/understand-github-actions), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
