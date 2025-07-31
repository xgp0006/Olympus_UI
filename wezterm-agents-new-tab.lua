-- WezTerm configuration to launch agents in a new tab of current session
local wezterm = require 'wezterm'
local act = wezterm.action

-- Function to create the grid layout
local function create_agent_grid(window, pane)
  -- Create new tab
  window:perform_action(act.SpawnTab 'CurrentPaneDomain', pane)
  
  -- Get the new tab's pane
  local tab = window:active_tab()
  local new_pane = tab:active_pane()
  
  -- Create 2x3 grid
  -- First row splits
  local pane_location = new_pane
  local pane_crosshair = pane_location:split { direction = 'Right', size = 0.333 }
  local pane_extra = pane_crosshair:split { direction = 'Right', size = 0.5 }
  
  -- Second row
  local pane_measuring = pane_location:split { direction = 'Bottom', size = 0.5 }
  local pane_messaging = pane_crosshair:split { direction = 'Bottom', size = 0.5 }
  local pane_adsb = pane_extra:split { direction = 'Bottom', size = 0.5 }
  
  -- Third row - weather spans bottom
  local pane_weather = pane_measuring:split { direction = 'Bottom', size = 0.5 }
  pane_messaging:split { direction = 'Bottom', size = 0.5 }
  pane_adsb:split { direction = 'Bottom', size = 0.5 }
  
  -- Set working directories and launch Claude
  pane_location:send_text('cd .claude-orchestrator/worktrees/location-entry && echo "Location Entry Agent - Run: claude" && claude\n')
  pane_crosshair:send_text('cd .claude-orchestrator/worktrees/map-crosshair && echo "Map Crosshair Agent - Run: claude" && claude\n')
  pane_measuring:send_text('cd .claude-orchestrator/worktrees/measuring-tools && echo "Measuring Tools Agent - Run: claude" && claude\n')
  pane_messaging:send_text('cd .claude-orchestrator/worktrees/messaging-system && echo "Messaging System Agent - Run: claude" && claude\n')
  pane_adsb:send_text('cd .claude-orchestrator/worktrees/adsb-display && echo "ADS-B Display Agent - Run: claude" && claude\n')
  pane_weather:send_text('cd .claude-orchestrator/worktrees/weather-overlay && echo "Weather Overlay Agent - Run: claude" && claude\n')
  
  -- Rename the tab
  window:perform_action(act.ActivateTab(tab:tab_id()), pane)
  tab:set_title("🚀 Map Agents")
end

-- Key binding to create agent grid
wezterm.on('create-agent-grid', function(window, pane)
  create_agent_grid(window, pane)
end)

return {
  -- Your existing config can go here
  -- This adds a key binding to create the agent grid
  keys = {
    -- Ctrl+Shift+A to create agent grid in new tab
    {
      key = 'A',
      mods = 'CTRL|SHIFT',
      action = act.EmitEvent 'create-agent-grid',
    },
  },
  
  -- Optional: Set tab bar to show at top
  enable_tab_bar = true,
  tab_bar_at_bottom = false,
  
  -- Colors for better visibility
  colors = {
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
  },
}