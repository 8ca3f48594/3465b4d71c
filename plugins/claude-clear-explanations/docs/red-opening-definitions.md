# RED: define the subject before the walkthrough

Date: 2026-09-21. Command: `node --test tests/opening.test.mjs`.

Live await vs create_task on `c8c8417` opened with “Awaiting a coroutine
runs it immediately…”. A coroutine was never defined. The async-tasks
slice modeled that jump: it named an async task, then said awaiting a
coroutine runs it.

The first sentence must say what the subject is. Then define the few
terms the example will use. Then the walkthrough. A gerund-led opening
that uses a term before giving it a kind fails. The tests were not
weakened.
