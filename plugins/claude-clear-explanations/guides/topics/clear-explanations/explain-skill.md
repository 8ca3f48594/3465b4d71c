/c90373deff:explain is a Claude Code skill. SKILL.md is the tiny file for that skill. It says use the injected teaching packet. UserPromptSubmit is the hook that runs inject-guides. inject-guides term-matches the question and attaches at most four working-memory slices. Topic files supply facts and analog mappings. The always-on regulations are define kind, define-then-pair, stay-or-cut, and stop after the result. The Stop hook checks surface rules and can ask for one revision. After that, the answer stands unless the rewrite still skips the asked subject. It is not a correctness judge.

A teaching packet is the injected guide for this turn, like a recipe.
A running answer is one explanation built from that packet, like a dish made from that recipe.

The reader asks how this skill writes an explanation. inject-guides matches those terms, attaches the matched slice, and injects the packet (the recipe). The model writes the answer (the dish) from that packet (the recipe). The Stop hook checks the answer (the dish) and asks for one revision or lets it stand.
