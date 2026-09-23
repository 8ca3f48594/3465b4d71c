A coroutine is an object a function call builds but does not run.

Awaiting that object runs it in the current task. create_task is a separate
task the event loop can switch to during a wait.

In Python asyncio, calling the function only builds the object. One cook can
start the next dish while water heats. That maps waiting to task switching.
It does not mean one thread executes two CPU instructions at once.
