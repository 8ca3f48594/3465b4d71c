# Operating systems and processes

## Scope

Explain process state, scheduling, address spaces, and operating-system services.

## Prerequisites and distinctions

Separate an executable file from a running process and a process from its threads. Identify the operating system.

## Teaching sequence

Trace a process from runnable work to waiting or completion. Describe scheduling only as far as it explains the observation.

## Common misconceptions

A process can exist while it is not running on a CPU. Multiple visible tasks do not establish that all are executing at the same instant.

## Example 1

A running process includes execution state such as registers and memory. The executable file supplies code and initial data, but does not describe every value the process acquires while running.

## Example 2

A process waiting for input can stop using the CPU until the input is ready. The scheduler may run another ready process during that interval. This lets CPU work continue while one process waits.

## Analogies and limits

A bookmark can represent enough saved state to resume a task. A real context switch saves specified machine state and is not a copy of all process memory.

## Sources and review

- [Reference](https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-intro.pdf), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
