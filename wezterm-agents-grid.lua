-- WezTerm configuration for viewing all agents in a grid
local wezterm = require 'wezterm'
local mux = wezterm.mux

wezterm.on('gui-startup', function(cmd)
  -- Create a new window with grid layout
  local tab, pane, window = mux.spawn_window(cmd or {})
  
  -- Split into 2x3 grid for 6 agents
  -- Row 1
  local pane_location = pane:split { direction = 'Right' }
  local pane_crosshair = pane_location:split { direction = 'Right' }
  
  -- Row 2
  local pane_measuring = pane:split { direction = 'Bottom' }
  local pane_messaging = pane_location:split { direction = 'Bottom' }
  local pane_adsb = pane_crosshair:split { direction = 'Bottom' }
  
  -- Row 3 (weather overlay spans bottom)
  local pane_weather = pane_measuring:split { direction = 'Bottom' }
  
  -- Set working directories and launch Claude
  pane:send_text('cd .claude-orchestrator/worktrees/location-entry && claude\n')
  pane_crosshair:send_text('cd .claude-orchestrator/worktrees/map-crosshair && claude\n')
  pane_measuring:send_text('cd .claude-orchestrator/worktrees/measuring-tools && claude\n')
  pane_messaging:send_text('cd .claude-orchestrator/worktrees/messaging-system && claude\n')
  pane_adsb:send_text('cd .claude-orchestrator/worktrees/adsb-display && claude\n')
  pane_weather:send_text('cd .claude-orchestrator/worktrees/weather-overlay && claude\n')
end)

return {
  -- Window appearance
  window_decorations = "RESIZE",
  enable_tab_bar = true,
  
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
  
  -- Font for readability
  font = wezterm.font('JetBrains Mono', { weight = 'Regular' }),
  font_size = 10.0,
  
  -- Initial window size (adjust for your screen)
  initial_cols = 240,
  initial_rows = 60,
}