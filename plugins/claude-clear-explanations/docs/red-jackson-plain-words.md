# RED: first sentence must say what the subject is

Date: 2026-09-21. Command: `node --test tests/native-routing.test.mjs`.

Live cache opened with purpose only (`exist so`). Live WAL opened with
`is how` and never said what a write-ahead log is. Before this change those
openings produced `shouldBlock: false`. The fix is a definition-first
opening check, not a banned-word list. The tests were not weakened.
