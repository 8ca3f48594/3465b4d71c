# Memory and storage hardware

## Scope

Explain RAM, persistent storage, caches, and the path a program uses to access data.

## Prerequisites and distinctions

Identify whether the question concerns capacity, latency, bandwidth, or persistence. Separate virtual addresses from physical storage.

## Teaching sequence

Follow one value from storage into memory and into computation. Name the copies and the event that changes persistence.

## Common misconceptions

An address in a program is not necessarily a physical RAM address. Available address space and installed RAM are different quantities.

## Example 1

A process uses virtual addresses. The operating system and hardware translate those addresses to memory mappings. Two processes can use the same numerical virtual address while referring to different physical memory.

## Example 2

If an application changes a value only in volatile memory, that change is not yet a durable file update. The program needs the appropriate storage operation and durability guarantees before claiming that a restart preserves it.

## Analogies and limits

A desk and filing cabinet can distinguish active work from stored material. The analogy omits virtual memory, caches, write buffers, and explicit persistence guarantees.

## Sources and review

- [Reference](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-intro.pdf), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
