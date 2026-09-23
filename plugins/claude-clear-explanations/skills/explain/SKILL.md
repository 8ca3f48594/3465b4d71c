---
name: explain
description: Explain code, bugs, systems, technical concepts, or tradeoffs in direct audience-aware language. Use when the user asks what, why, or how something works; requests a walkthrough, comparison, diagnosis, or clarification; or says an earlier explanation was confusing. Do not use for a request that only asks to implement a change and needs no explanation.
argument-hint: [question, code, or topic]
hooks:
  UserPromptSubmit:
    - hooks:
        - type: command
          command: node "${CLAUDE_PLUGIN_ROOT}/scripts/inject-guides.mjs"
          timeout: 5
  Stop:
    - hooks:
        - type: command
          command: node "${CLAUDE_PLUGIN_ROOT}/scripts/check-explanation.mjs"
          timeout: 5
---
# Explain for this reader

A teaching packet is injected with this turn. Use that packet. Do not search the
repository for plugin guides. If the packet is missing, say the guidance failed
to load and stop.

Establish factual claims from the code, command output, documentation, or supplied
facts. For every derived numerical claim, check the calculation. Omit unsupported
numerical estimates. If an estimate is useful, state its assumptions and present
a range with uncertainty.

The Stop hook checks limited surface rules and known Git misconceptions. It is
not a correctness judge. The separate local runner holds answers until review.

$ARGUMENTS
