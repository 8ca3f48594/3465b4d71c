TCP is a byte stream between two programs: bytes arrive in order, and the
stream does not mark where one send stopped.

A write is one send call.

write("HELLO") then write("WORLD") can arrive as one HELLOWORLD read, or as
HEL then LOWORLD. A pipe maps that: water stays in order, and nothing marks
each pour. The pipe does not cover loss or retransmission. The application
has to mark the boundary.
