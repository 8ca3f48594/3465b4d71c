# RED: empty setup sentences must not pass

Date: 2026-09-21. Command: `node --test tests/padding.test.mjs`.

Live lost-increment on `61be4ba` opened with a definition, then used a
sentence that added no fact, cause, limit, or result. The checker was
clean. The packet already required that a sentence stay only if deleting
it removes one of those. The checker now fails a short sentence that has
no leftover content after function, filler, and role words. That is a
structure check, not a banned-phrase list. The tests were not weakened.
