#!/usr/bin/env bash
# scripts/init-ai-agents.sh
# Sets up the multi-agent scaffolding for this repo.
# Safe to re-run — will not overwrite existing files.
set -euo pipefail

mkdir -p .github/agents
mkdir -p .github/instructions
mkdir -p .ai
mkdir -p scripts

for f in AGENTS.md .github/copilot-instructions.md .ai/agent-board.md .ai/decisions.md \
          .github/agents/orchestrator.agent.md \
          .github/agents/planner.agent.md \
          .github/agents/implementer.agent.md \
          .github/agents/tester.agent.md \
          .github/agents/reviewer.agent.md \
          .github/instructions/frontend.instructions.md \
          .github/instructions/backend.instructions.md; do
  if [ -f "$f" ]; then
    echo "  exists:  $f"
  else
    echo "  missing: $f (run git pull to get it)"
  fi
done

echo ""
echo "Agent files are ready. Open VS Code and use @Orchestrator, @Planner, @Implementer, @Tester, or @Reviewer in chat."
