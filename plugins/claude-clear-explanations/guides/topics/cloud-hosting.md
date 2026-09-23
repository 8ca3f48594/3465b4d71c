# Cloud hosting models

## Scope

Explain hosting choices and who operates each part of a system.

## Prerequisites and distinctions

Identify the application, deployment unit, and operational responsibilities. Distinguish infrastructure, platform, and software services.

## Teaching sequence

Trace what must run and who manages it. Compare the choices using the user's workload and constraints.

## Common misconceptions

A managed service changes responsibility boundaries. It does not remove the need to configure access, understand limits, or verify recovery.

## Example 1

With an infrastructure service, a customer may provision a virtual machine and manage its guest operating system. With a platform service, the provider manages more of the runtime. The exact boundary depends on the service contract.

## Example 2

Hosting an application and storing its data are separate responsibilities. A service may restart an application instance while durable data remains in a database, provided the application actually writes its data there.

## Analogies and limits

Renting a workspace can illustrate shared responsibility: the owner maintains some parts and the tenant others. The contract, not the analogy, determines cloud responsibilities.

## Sources and review

- [Reference](https://csrc.nist.gov/pubs/sp/800/145/final), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
