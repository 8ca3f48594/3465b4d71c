# RED: native Git closer menus extras and offers to continue

Date: 2026-09-21. Live packet-on `/clear-explanations:explain Explain Git.`
named Git in sentence one and taught save vs commit as `is not the same`.
The closer still listed staging / branches / sharing and offered to continue.
`eval:score` also failed `commit-not-editor-save` on `is not` vs `does not`.

Command: `node --test tests/native-routing.test.mjs`.

Before this change, that closer produced `shouldBlock: false` and
`commit-not-editor-save` failed the live wording. The tests were not weakened.
