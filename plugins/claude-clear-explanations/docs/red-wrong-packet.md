# RED: whole-guide score must not pick a neighbor topic

Date: 2026-09-21. Command: `node --test tests/native-routing.test.mjs`.

Live ABA on `28bd962` selected `concurrency-async` because `scoreEntry`
added 2 for the id fragment `concurrency` and 1 for `explain` in every
description, then `load` dumped the unsliced asyncio guide. `d9da42e`
routed the ABA string to `compare-swap` but left that scoring rule in
place for unsliced topics. The same rule sent "memory barrier" to
`learning-memory` (`id:memory` plus `desc:memory`).

The system now selects a topic only when a declared term or slice term
hits. No id-fragment score. No description bag-of-words. No
nearest-neighbor extras in `rankIndex`. No git fallback when no slice
matches. A miss omits the topic. The tests were not weakened.
