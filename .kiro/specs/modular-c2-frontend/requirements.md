# Requirements Document

## Introduction

The Modular Command & Control (C2) Svelte Frontend is a lightweight, performant, and ultra-reliable user interface for a modular aerospace command and control platform. It serves as a pure visualization and user-input layer, with all mission-critical logic residing in the Rust backend. The UI is fully themeable to support diverse operational environments and operator preferences, with a default theme optimized for battery savings on AMOLED displays.

## Requirements

### 1. Host Application Shell

**User Story:** As an aerospace operator, I want a minimal but robust application shell that provides the main window structure and plugin loading mechanism, so that I can access different mission control features in a unified interface.

#### Acceptance Criteria

1. WHEN the application starts THEN the system SHALL load a minimal SvelteKit application that provides the main window structure.
2. WHEN plugins are available THEN the system SHALL dynamically load and render these plugins in the main content area.
3. WHEN the application is running THEN the system SHALL provide state management for the UI itself.
4. WHEN the application is running THEN the system SHALL be borderless by default.
5. WHEN the application starts THEN the system SHALL display a card-based dashboard as the default view.
6. WHEN the Rust backend loads plugins THEN the system SHALL dynamically add new cards for each plugin to the dashboard grid.
7. WHEN a user clicks a plugin card THEN the system SHALL navigate to that plugin's main view, replacing the dashboard.
8. WHEN a plugin view is active THEN the system SHALL always provide a "Home" button or gesture to return to the dashboard.
9. WHEN the user enters plug-in management, THEN user SHALL be able to disable or enable plug-in loading saving pre-set plug-in loading and enable/disable at will.

### 2. Persistent CLI Panel

**User Story:** As an aerospace operator, I want a persistent CLI panel that provides direct access to the application's underlying CLI suite, so that I can execute commands quickly without switching contexts.

#### Acceptance Criteria

1. WHEN the application is running THEN the system SHALL display a core, non-removable CLI panel at the bottom of the screen.
2. WHEN the CLI panel is visible THEN the system SHALL allow it to be resized vertically by dragging its top edge.
3. WHEN the user presses a keyboard shortcut (e.g., Ctrl+~) THEN the system SHALL toggle the CLI panel between collapsed and expanded states.
4. WHEN the CLI panel is visible THEN the system SHALL provide a UI button to toggle between collapsed and expanded states.
5. WHEN the CLI panel loads THEN the system SHALL write a welcome message.
6. WHEN the Rust backend emits cli-output events THEN the system SHALL write each line to the terminal.
7. WHEN the CLI panel displays output THEN the system SHALL visually distinguish between stdout and stderr streams.
8. WHEN the user enters a command THEN the system SHALL send it to a run_cli_command Tauri command.

### 3. Theming Engine

**User Story:** As an aerospace operator, I want a fully themeable UI, so that I can adapt the interface to diverse operational environments and personal preferences.

#### Acceptance Criteria

1. WHEN the application is styled THEN the system SHALL use a centralized theme engine with no hardcoded colors, fonts, or sizes in component styles.
2. WHEN the application starts THEN the system SHALL load a single theme JSON file (theme.json) that defines all visual attributes.
3. WHEN the application starts THEN the system SHALL load the theme into a Svelte store (themeStore).
4. WHEN the theme is loaded THEN the system SHALL apply the theme attributes as CSS custom properties to the :root element.
5. WHEN components are styled THEN the system SHALL reference these CSS variables in all Tailwind CSS configuration and component styles.
6. WHEN no theme is specified THEN the system SHALL use super_amoled_black.json as the default theme.
7. WHEN user selects animation types or styles THEN the system SHALL change animations based on animation library for transitions, hovers, and button press/release animations as part of the customized theme.

### 4. Mission Planner Plugin

**User Story:** As a mission planner, I want a sophisticated, component-driven interface for creating and managing vehicle missions, so that I can efficiently plan and visualize complex aerospace operations.

#### Acceptance Criteria

1. WHEN the Mission Planner plugin is loaded THEN the system SHALL display a two-panel layout with the MapViewer on one side and the DOCKABLE/UNDOCKABLE MissionAccordion on the other. with mapviewer reactive to application window with correct scaling
2. WHEN building a mission THEN the system SHALL represent it as a sequence of Mission Components (e.g., Takeoff, Waypoint, Loiter, Land).CONNECTED to MAVLINK data structures
3. WHEN displaying mission components THEN the system SHALL show them in a re-arrangeable, borderless accordion panel.
4. WHEN mission components are arranged in the accordion THEN the system SHALL use their order to define the mission sequence.
5. WHEN a mission component is minimized THEN the system SHALL display it as a Hexagonal Coin that can be dragged freely.
6. WHEN a Hexagonal Coin is dragged THEN the system SHALL allow it to be pinned to the UI or snapped to other coins.
7. WHEN mission items are reordered THEN the system SHALL invoke a Rust command (reorder_mission_item) to update the authoritative state.
8. WHEN waypoint parameters are changed THEN the system SHALL invoke a Rust command (update_waypoint_params) to validate and save the change.
9. WHEN an accordion item is clicked THEN the system SHALL pan the map to and highlight the corresponding waypoint marker.
10. WHEN a MinimizedCoin is double-clicked THEN the system SHALL expand it back into its full WaypointItem view within the accordion.

### 5. SDR Suite Plugin

**User Story:** As a communications specialist, I want an SDR Suite plugin, so that I can visualize and analyze radio frequency data.

#### Acceptance Criteria

1. WHEN the SDR Suite plugin is loaded THEN the system SHALL display an SdrDashboard component.
2. WHEN the SdrDashboard is visible THEN the system SHALL include a SpectrumVisualizer component that displays FFT data from the backend.
3. WHEN the SdrDashboard is visible THEN the system SHALL include a Waterfall component.
4. WHEN the SDR components are displayed THEN the system SHALL apply theme attributes for spectrum_line_color, spectrum_fill_color, waterfall_color_gradient, grid_line_color, and axis_label_color.
5. WHEN the SdrDashboard is visible THEN system SHALL include radio frequency tuner, and associated soapy rtl-sdr based buttons and settings to directly communicate to the rust soapysdr rust back end compute

### 6. API Contract

**User Story:** As a developer, I want a clear API contract between the frontend and backend, so that I can ensure proper integration between the Svelte frontend and the Rust backend.

#### Acceptance Criteria

1. WHEN interacting with plugins THEN the system SHALL use defined Tauri commands and events.
2. WHEN loading plugins THEN the system SHALL use the load_plugin(name: String) command.
3. WHEN unloading plugins THEN the system SHALL use the unload_plugin(name: String) command.
4. WHEN retrieving loaded plugins THEN the system SHALL use the get_loaded_plugins() -> string[] command.
5. WHEN plugins change THEN the system SHALL listen for the plugins-changed -> string[] event.
6. WHEN running CLI commands THEN the system SHALL use the run_cli_command(command: String) command.
7. WHEN receiving CLI output THEN the system SHALL listen for the cli-output -> { line: string, stream: 'stdout' | 'stderr' } event.
8. WHEN the CLI terminates THEN the system SHALL listen for the cli-terminated -> { code: number } event.
9. WHEN updating waypoint parameters THEN the system SHALL use the update_waypoint_params(waypointId, params) command.
10. WHEN reordering mission items THEN the system SHALL use the reorder_mission_item(itemId, newIndex) command.
