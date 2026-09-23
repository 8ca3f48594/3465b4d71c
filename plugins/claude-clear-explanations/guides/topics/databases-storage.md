# Databases and storage models

## Scope

Explain records, transactions, indexes, durability, and storage choices.

## Prerequisites and distinctions

Identify the database and transaction boundary. Separate atomicity, isolation, and durability rather than treating them as one property.

## Teaching sequence

Use a small state change, show the commit boundary, then explain what another reader may observe under the stated isolation level.

## Common misconceptions

A transaction does not make every application operation atomic. External API calls and file writes need their own consistency design.

## Example 1

Suppose a database transaction updates an order and inserts its line items. If the transaction rolls back, its database changes are canceled together. An email sent outside the transaction is not automatically recalled.

## Example 2

In PostgreSQL, BEGIN starts an explicit transaction block and COMMIT completes it. ROLLBACK cancels its uncommitted changes. The client library may also manage transaction boundaries, so inspect its behavior before assuming each statement commits separately.

## Analogies and limits

A draft document can represent uncommitted work and publishing can represent commit. The analogy does not describe isolation levels or crash recovery.

## Sources and review

- [Reference](https://www.postgresql.org/docs/current/tutorial-transactions.html), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
