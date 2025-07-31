#!/bin/bash

# Mission Control - Automated Map Features Launch Script
# Launches all agents for 144fps aerospace-grade development

set -e

echo "🚀 MISSION CONTROL - MAP FEATURES DEVELOPMENT"
echo "============================================="
echo "Target: 144fps performance across all systems"
echo "Mode: Non-blocking validation (bypass enabled)"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
ORCHESTRATOR_DIR=".claude-orchestrator"
MISSION_CONTROL="./mission-control"
PARALLEL_LAUNCH=true

# Ensure Mission Control is installed
if [ ! -f "$MISSION_CONTROL" ]; then
    echo -e "${YELLOW}Setting up Mission Control...${NC}"
    ./scripts/orchestrator/setup.sh
fi

# Start Mission Control if not running
echo -e "${BLUE}Starting Mission Control...${NC}"
$MISSION_CONTROL start > /dev/null 2>&1 &
MC_PID=$!

# Wait for Mission Control to initialize
sleep 3

echo -e "${GREEN}✅ Mission Control online (PID: $MC_PID)${NC}"
echo ""

# Launch Audit Validator first (background monitoring)
echo -e "${BLUE}Launching Audit Validator (background)...${NC}"
$MISSION_CONTROL launch validator \
    --name "audit-validator" \
    --task "Monitor all agent code for NASA JPL compliance and performance" \
    --focus "all-worktrees" \
    --bypass-mode &

sleep 2

# Function to launch agent
launch_agent() {
    local agent_type=$1
    local agent_name=$2
    local task=$3
    local focus=$4
    
    echo -e "${BLUE}Launching $agent_name...${NC}"
    
    $MISSION_CONTROL launch $agent_type \
        --name "$agent_name" \
        --task "$task" \
        --focus "$focus" &
    
    # Small delay between launches
    sleep 1
}

# Launch all feature agents in parallel
echo -e "\n${YELLOW}Launching Feature Development Agents...${NC}\n"

# Agent 1: Location Entry
launch_agent "ui" "location-entry" \
    "Implement multi-format coordinate entry (MGRS, UTM, Lat/Long, What3Words)" \
    "src/lib/map-features/location-entry"

# Agent 2: Map Crosshair
launch_agent "ui" "map-crosshair" \
    "Create dynamic crosshair with distance rings and NATO/civilian icons" \
    "src/lib/map-features/crosshair"

# Agent 3: Measuring Tools
launch_agent "plugin" "measuring-tools" \
    "Build shape drawing tools with spline curves and waypoint conversion" \
    "src/lib/map-features/measuring"

# Agent 4: Messaging System
launch_agent "telemetry" "messaging-system" \
    "Develop toast notifications for NOTAMS, ADS-B, weather warnings" \
    "src/lib/map-features/messaging"

# Agent 5: ADS-B Display
launch_agent "telemetry" "adsb-display" \
    "Implement real-time ADS-B tracking with 500+ aircraft at 144fps" \
    "src/lib/map-features/adsb"

# Agent 6: Weather Overlay
launch_agent "ui" "weather-overlay" \
    "Create AccuWeather-style visualization with WebGL rendering" \
    "src/lib/map-features/weather"

# Wait for all agents to initialize
echo -e "\n${YELLOW}Waiting for agents to initialize...${NC}"
sleep 10

# Display status
echo -e "\n${GREEN}✅ All agents launched!${NC}\n"
$MISSION_CONTROL status

# Set up continuous monitoring
echo -e "\n${BLUE}Setting up continuous monitoring...${NC}"

# Create performance monitoring script
cat > $ORCHESTRATOR_DIR/monitor-performance.sh << 'EOF'
#!/bin/bash
while true; do
    # Check frame rates
    FPS=$(curl -s http://localhost:8765/metrics | jq '.fps')
    
    if (( $(echo "$FPS < 144" | bc -l) )); then
        echo "⚠️  Performance Warning: FPS dropped to $FPS"
    fi
    
    sleep 5
done
EOF

chmod +x $ORCHESTRATOR_DIR/monitor-performance.sh

# Start performance monitor
$ORCHESTRATOR_DIR/monitor-performance.sh > $ORCHESTRATOR_DIR/logs/performance.log 2>&1 &
PERF_PID=$!

echo -e "${GREEN}✅ Performance monitor started (PID: $PERF_PID)${NC}"

# Create helper commands
echo -e "\n${BLUE}Creating helper commands...${NC}"

cat > mc-status << 'EOF'
#!/bin/bash
./mission-control status
EOF

cat > mc-validate << 'EOF'
#!/bin/bash
./mission-control validate
EOF

cat > mc-merge << 'EOF'
#!/bin/bash
./mission-control merge main
EOF

cat > mc-stop << 'EOF'
#!/bin/bash
echo "Stopping all agents..."
./mission-control stop
pkill -f monitor-performance.sh
echo "✅ All processes stopped"
EOF

chmod +x mc-status mc-validate mc-merge mc-stop

# Final instructions
echo -e "\n${GREEN}🚀 MISSION CONTROL READY!${NC}"
echo -e "\n${YELLOW}Quick Commands:${NC}"
echo "  ./mc-status     - Check agent status"
echo "  ./mc-validate   - Validate all code"
echo "  ./mc-merge      - Merge to main branch"
echo "  ./mc-stop       - Stop all agents"
echo ""
echo -e "${YELLOW}Agent Workspaces:${NC}"
echo "  Location Entry:   $ORCHESTRATOR_DIR/worktrees/agent-location-entry"
echo "  Map Crosshair:    $ORCHESTRATOR_DIR/worktrees/agent-map-crosshair"
echo "  Measuring Tools:  $ORCHESTRATOR_DIR/worktrees/agent-measuring-tools"
echo "  Messaging:        $ORCHESTRATOR_DIR/worktrees/agent-messaging-system"
echo "  ADS-B Display:    $ORCHESTRATOR_DIR/worktrees/agent-adsb-display"
echo "  Weather Overlay:  $ORCHESTRATOR_DIR/worktrees/agent-weather-overlay"
echo ""
echo -e "${YELLOW}Monitoring:${NC}"
echo "  Logs:             $ORCHESTRATOR_DIR/logs/"
echo "  Performance:      tail -f $ORCHESTRATOR_DIR/logs/performance.log"
echo "  Validation:       tail -f $ORCHESTRATOR_DIR/logs/validation.log"
echo ""
echo -e "${GREEN}All systems nominal. Agents are developing at 144fps! 🎯${NC}"
echo ""
echo -e "${BLUE}Pro tip: Use 'wezterm --config-file $ORCHESTRATOR_DIR/wezterm-mission-control.lua' for visual monitoring${NC}"