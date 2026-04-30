#!/bin/bash
# Olympus_UI — first-clone developer setup
#
# Run once after `gh repo clone xgp0006/Olympus_UI`. Activates the project's
# pinned toolchain via mise, installs dependencies (which wires husky's
# git hooks via the prepare script), and verifies the developer's local
# git config produces the signed, attributable commits NASA JPL audit
# trails require.
#
# Idempotent: safe to re-run after pulling new toolchain pins, hook
# changes, or dep updates.

set -euo pipefail

readonly REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# --- toolchain ---------------------------------------------------------------

if ! command -v mise >/dev/null 2>&1; then
  echo "❌ mise not found on PATH. Install from https://mise.jdx.dev or your distro's package manager." >&2
  exit 1
fi

echo "▶ Installing pinned toolchain via mise (.mise.toml)..."
mise install

echo "▶ Installed versions:"
mise list

# --- dependencies + git hooks ------------------------------------------------
# pnpm install runs the `prepare` script (husky), which sets up .husky/
# git-hook trampolines, AND runs the `postinstall` script
# (scripts/init-husky.cjs), which is now idempotent (skips re-init when
# .husky/_/ already exists, preserving the aerospace pre-commit hook).

echo "▶ Installing dependencies via pnpm..."
pnpm install --frozen-lockfile

# --- commit signing (NASA JPL audit trail) -----------------------------------
# Aerospace compliance expects every commit to have verifiable provenance.
# Warn (don't fail) if the local config isn't set up — solo dev may push
# unsigned during exploration; CI / branch protection enforces the gate.

signing_key="$(git config --get user.signingkey 2>/dev/null || true)"
sign_enabled="$(git config --get commit.gpgsign 2>/dev/null || true)"

if [ -z "$signing_key" ]; then
  echo "⚠ git user.signingkey is not set. Aerospace audit trail prefers signed commits."
  echo "  Configure: git config --global user.signingkey <ssh-key-path-or-id>"
fi

if [ "$sign_enabled" != "true" ]; then
  echo "⚠ git commit.gpgsign is not 'true'. Configure: git config --global commit.gpgsign true"
fi

# --- summary -----------------------------------------------------------------

echo ""
echo "✅ Olympus_UI dev environment ready."
echo ""
echo "Next steps:"
echo "  - pnpm dev          # development server (port 1420 for Tauri)"
echo "  - pnpm tauri dev    # Tauri desktop app in dev mode"
echo "  - pnpm build        # production build"
echo "  - See docs/compliance/baseline.md for the current NASA JPL violation map"
