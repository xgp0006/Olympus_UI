#!/bin/bash

# Mission Control Setup Script
# Prepares the environment for aerospace-grade parallel development

set -e

echo "🚀 Mission Control Setup"
echo "========================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm --version)${NC}"

# Check Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Git $(git --version)${NC}"

# Check WezTerm
if ! command -v wezterm &> /dev/null; then
    echo -e "${YELLOW}⚠️  WezTerm is not installed${NC}"
    echo "Please install WezTerm from: https://wezfurlong.org/wezterm/install"
    read -p "Continue without WezTerm? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ WezTerm $(wezterm --version)${NC}"
fi

# Check Claude CLI
if ! command -v claude &> /dev/null; then
    echo -e "${RED}❌ Claude CLI is not installed${NC}"
    echo "Please install Claude CLI: npm install -g @anthropic-ai/claude-cli"
    exit 1
fi
echo -e "${GREEN}✅ Claude CLI installed${NC}"

# Install dependencies
echo -e "\n${BLUE}Installing dependencies...${NC}"
npm install --save-dev \
    typescript \
    tsx \
    commander \
    chalk \
    ws \
    @types/ws \
    @types/node

# Create orchestrator directories
echo -e "\n${BLUE}Creating orchestrator structure...${NC}"
mkdir -p .claude-orchestrator/{config,worktrees,logs,layouts}

# Create default configuration
echo -e "\n${BLUE}Creating default configuration...${NC}"
cat > .claude-orchestrator/config/mission-control.json << 'EOF'
{
  "maxAgents": 6,
  "worktreeBasePath": ".claude-orchestrator/worktrees",
  "validationStrategy": {
    "preCommitChecks": ["npm run check", "npm run lint"],
    "continuousValidation": true,
    "validationInterval": 300000,
    "failureThreshold": 3
  },
  "mergeStrategy": {
    "type": "sequential",
    "conflictResolution": "ai-assisted",
    "testBeforeMerge": true,
    "requireAllTestsPass": true
  },
  "resourceLimits": {
    "maxCpuPercent": 80,
    "maxMemoryMB": 8192,
    "maxDiskIOMBps": 100,
    "maxNetworkMBps": 50
  },
  "agentDefaults": {
    "ui": {
      "focusAreas": ["src/lib/components", "src/routes"],
      "validationRules": ["component-tests", "accessibility"]
    },
    "plugin": {
      "focusAreas": ["src/lib/plugins"],
      "validationRules": ["plugin-interface", "isolation"]
    },
    "telemetry": {
      "focusAreas": ["src/lib/telemetry", "src/lib/utils/websocket"],
      "validationRules": ["memory-bounds", "performance"]
    }
  }
}
EOF

# Create WezTerm configuration
echo -e "\n${BLUE}Creating WezTerm configuration...${NC}"
cat > .claude-orchestrator/wezterm-mission-control.lua << 'EOF'
-- WezTerm configuration for Mission Control

local wezterm = require 'wezterm'
local config = {}

-- Mission Control color scheme
config.color_scheme = 'Builtin Dark'
config.colors = {
  background = '#0a0e27',
  cursor_bg = '#00ff00',
  cursor_border = '#00ff00',
  selection_bg = '#1e3a8a',
  selection_fg = '#ffffff',
  
  -- Mission Control theme
  tab_bar = {
    background = '#0a0e27',
    active_tab = {
      bg_color = '#1e3a8a',
      fg_color = '#ffffff',
    },
    inactive_tab = {
      bg_color = '#162447',
      fg_color = '#8b92b3',
    },
  },
}

-- Font configuration for readability
config.font = wezterm.font_with_fallback {
  'JetBrains Mono',
  'Cascadia Code',
  'Consolas',
}
config.font_size = 11.0

-- Window configuration
config.window_padding = {
  left = 10,
  right = 10,
  top = 10,
  bottom = 10,
}

-- Tab bar
config.enable_tab_bar = true
config.hide_tab_bar_if_only_one_tab = false
config.tab_bar_at_bottom = false

-- Key bindings for Mission Control
config.keys = {
  -- Split panes
  {
    key = 'd',
    mods = 'CTRL|SHIFT',
    action = wezterm.action.SplitHorizontal { domain = 'CurrentPaneDomain' },
  },
  {
    key = 'e',
    mods = 'CTRL|SHIFT',
    action = wezterm.action.SplitVertical { domain = 'CurrentPaneDomain' },
  },
  -- Navigate panes
  {
    key = 'h',
    mods = 'CTRL|SHIFT',
    action = wezterm.action.ActivatePaneDirection 'Left',
  },
  {
    key = 'l',
    mods = 'CTRL|SHIFT',
    action = wezterm.action.ActivatePaneDirection 'Right',
  },
  {
    key = 'k',
    mods = 'CTRL|SHIFT',
    action = wezterm.action.ActivatePaneDirection 'Up',
  },
  {
    key = 'j',
    mods = 'CTRL|SHIFT',
    action = wezterm.action.ActivatePaneDirection 'Down',
  },
  -- Mission Control specific
  {
    key = 'm',
    mods = 'CTRL|SHIFT',
    action = wezterm.action.EmitEvent 'mission-control-init',
  },
}

-- Mission Control layout event
wezterm.on('mission-control-init', function(window, pane)
  -- This would be handled by the Lua plugin
  window:toast_notification('Mission Control', 'Initializing layout...', nil, 4000)
end)

return config
EOF

# Create launcher script
echo -e "\n${BLUE}Creating launcher script...${NC}"
cat > mission-control << 'EOF'
#!/bin/bash
node scripts/orchestrator/mission-control.js "$@"
EOF
chmod +x mission-control

# Create example agent prompt template
echo -e "\n${BLUE}Creating agent prompt template...${NC}"
cat > .claude-orchestrator/config/agent-prompt-template.md << 'EOF'
# Agent: {{AGENT_TYPE}}

You are a specialized Claude agent working as part of a coordinated development team on an aerospace-grade C2 frontend project.

## Your Role
- Type: {{AGENT_TYPE}}
- Focus Areas: {{FOCUS_AREAS}}
- Current Task: {{TASK_DESCRIPTION}}

## Critical Requirements
1. All code MUST comply with NASA JPL Power of 10 rules
2. Maintain bounded memory allocation
3. Ensure type safety with TypeScript
4. Write comprehensive tests
5. Follow established patterns in the codebase

## Coordination
- You are working in worktree: {{WORKTREE_PATH}}
- Report progress via git commits with prefix: [{{AGENT_ID}}]
- Validate changes before committing
- Communicate blockers immediately

## Current Context
{{TASK_CONTEXT}}

Remember: Quality over speed. Aerospace-grade reliability is non-negotiable.
EOF

# Add to package.json scripts
echo -e "\n${BLUE}Updating package.json scripts...${NC}"
if command -v jq &> /dev/null; then
    # Use jq if available
    jq '.scripts += {
        "mc:start": "./mission-control start",
        "mc:stop": "./mission-control stop",
        "mc:status": "./mission-control status",
        "mc:validate": "./mission-control validate",
        "mc:launch": "./mission-control launch"
    }' package.json > package.json.tmp && mv package.json.tmp package.json
else
    echo -e "${YELLOW}⚠️  Please manually add the following scripts to package.json:${NC}"
    echo '  "mc:start": "./mission-control start",'
    echo '  "mc:stop": "./mission-control stop",'
    echo '  "mc:status": "./mission-control status",'
    echo '  "mc:validate": "./mission-control validate",'
    echo '  "mc:launch": "./mission-control launch"'
fi

# Create .gitignore entries
echo -e "\n${BLUE}Updating .gitignore...${NC}"
if ! grep -q ".claude-orchestrator" .gitignore 2>/dev/null; then
    echo -e "\n# Mission Control Orchestrator" >> .gitignore
    echo ".claude-orchestrator/worktrees/" >> .gitignore
    echo ".claude-orchestrator/logs/" >> .gitignore
    echo "mission-control.pid" >> .gitignore
fi

echo -e "\n${GREEN}✅ Mission Control setup complete!${NC}"
echo -e "\n${BLUE}Quick Start:${NC}"
echo "  1. Start Mission Control:    ${YELLOW}./mission-control start${NC}"
echo "  2. Launch UI agent:          ${YELLOW}./mission-control launch ui${NC}"
echo "  3. Launch test agent:        ${YELLOW}./mission-control launch test${NC}"
echo "  4. Check status:             ${YELLOW}./mission-control status${NC}"
echo "  5. Validate all worktrees:   ${YELLOW}./mission-control validate${NC}"
echo "  6. Merge to main:            ${YELLOW}./mission-control merge main${NC}"
echo -e "\n${BLUE}WezTerm Integration:${NC}"
echo "  - Use the config: ${YELLOW}wezterm --config-file .claude-orchestrator/wezterm-mission-control.lua${NC}"
echo "  - Press Ctrl+Shift+M to initialize Mission Control layout"
echo -e "\n${GREEN}🚀 Ready for aerospace-grade parallel development!${NC}"