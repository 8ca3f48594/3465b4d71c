A race is two tasks reading and writing the same state so the result depends on
who runs between the read and the write.

An increment is a read of a counter, then an add, then a write. Interleaving is
a pause between those steps that lets the other task run.

If both tasks read before either writes, both store the same new value. The
lost increment follows from that interleaving. Show the defined steps before
introducing a lock.
