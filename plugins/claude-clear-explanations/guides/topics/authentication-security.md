# Authentication and security

## Scope

Explain identity checks, permissions, trust boundaries, and access decisions.

## Prerequisites and distinctions

Identify the protected resource and actor. Separate authentication, authorization, and encryption.

## Teaching sequence

Show one allowed request and one denied request against the same permission rule. Explain where the server enforces that rule.

## Common misconceptions

A hidden UI control does not enforce server permissions. A verified identity may still lack permission to access a particular record.

## Example 1

Authentication establishes which account is making a request. Authorization checks whether that account can perform the requested operation on the requested object. Both checks may be needed for the same request.

## Example 2

If a user changes a document ID in an API request, the server must check access to the new document. Checking only that the user is signed in does not establish ownership or sharing permission.

## Analogies and limits

A badge maps to an identity credential and a door policy to permission. The analogy omits credential theft, delegation, and revocation.

## Sources and review

- [Reference](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
