# CPUs and GPUs

## Scope

Explain processor roles, parallel work, memory movement, and workload fit.

## Prerequisites and distinctions

Identify which work can run independently. Host memory is the computer's main
RAM; device memory is the GPU's own. Separate processor utilization, throughput, and response time.

## Teaching sequence

Trace data from host memory to computation and back. Explain parallel work before comparing processor counts.

## Common misconceptions

A GPU is not faster for every task. Transfer, launch, synchronization, and serial work can outweigh parallel compute gains.

## Example 1

A vector addition applies the same operation to many independent element pairs. A GPU can assign different elements to different threads. The total time still includes moving inputs and obtaining the result.

## Example 2

If an operation depends on the previous operation's result at every step, those dependencies limit parallel execution. Adding execution units does not remove the dependency chain.

## Analogies and limits

Many workers performing independent tasks can represent parallel computation. Workers are not literal GPU cores, and the analogy does not predict instruction throughput.

## Sources and review

- [Reference](https://docs.nvidia.com/cuda/cuda-c-programming-guide/), accessed 2026-09-16. The linked document supplies the concept; examples are original teaching cases.

Author checked. Independent agent review completed with source coverage limits recorded in the research notes; outcome evaluation pending.
