Compare-and-swap is a hardware instruction that writes a new value only if the
location still holds an expected value. The comparison uses that bit pattern,
not which object has lived at the address.

The ABA problem is that a freed address can be reused. The expected pattern can
return, so the swap succeeds and the structure now points at the wrong object.

Example: a lock-free stack is top -> A -> B. Thread 1 reads top=A and A.next=B,
then pauses. Thread 2 pops A and B, then pushes a new node D at the recycled
address A. Thread 1's compare-and-swap still sees address A, succeeds, and sets
top to B, a node that is no longer on the stack.

Stop at that result. Do not add later repair schemes unless the question asked
for them.
