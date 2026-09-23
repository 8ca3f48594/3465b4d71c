# RED: AI-ism phrases block native output

Date: 2026-09-21. Command: `node --test tests/native-routing.test.mjs tests/eval-corpus.test.mjs`.

Public explanation skills keep banned-phrase catalogs in SKILL.md. Before this
change, `Let me explain Git` and `It's worth noting that Git records a snapshot`
produced `shouldBlock: false`. Those tests failed first. The detectors live in
`src/aiisms.mjs`, not in SKILL.md. The tests were not weakened.
