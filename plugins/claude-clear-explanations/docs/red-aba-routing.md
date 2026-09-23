# RED: ABA must not get the asyncio packet

Date: 2026-09-21. Command: `node --test tests/native-routing.test.mjs`.

Live `/clear-explanations:explain` on `28bd962` for compare-and-swap / ABA
injected `concurrency-async` as the whole asyncio guide. Scoring was
`concurrency` from the topic id plus `explain` from every description. The
model then opened with process narration about the packet.

The fix scores sliced-topic vocabulary, keeps asyncio and compare-and-swap in
separate slices, and omits a sliced topic when no slice matches. No phrase
list was added. The tests were not weakened.
