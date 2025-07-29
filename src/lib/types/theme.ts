/**
 * Theme system type definitions for the Modular C2 Frontend
 * Defines the complete theme interface structure based on requirements 3.1, 3.2, 3.3
 * Updated to support both basic and responsive theme formats
 */

export interface Theme {
  name: string;
  metadata: {
    author: string;
    version: string;
    description?: string;
  };
  colors: {
    background_primary: string;
    background_secondary: string;
    background_tertiary: string;
    text_primary: string;
    text_secondary: string;
    text_disabled: string;
    accent_yellow: string;
    accent_blue: string;
    accent_red: string;
    accent_green: string;
  };
  typography: {
    font_family_sans: string;
    font_family_mono: string;
    font_size_base: string;
    font_size_lg: string;
    font_size_sm: string;
    // Optional responsive typography properties
    font_size_xs?: string;
    font_size_xl?: string;
    font_size_2xl?: string;
  };
  layout: {
    border_radius: string;
    border_width: string;
    spacing_unit: string;
    // Optional responsive layout properties
    spacing_xs?: string;
    spacing_sm?: string;
    spacing_lg?: string;
    spacing_xl?: string;
    spacing_2xl?: string;
  };
  components: {
    cli: {
      background: string;
      text_color: string;
      cursor_color: string;
      cursor_shape: string;
      // Optional responsive CLI properties
      mobile_height?: string;
      tablet_height?: string;
      desktop_height?: string;
    };
    map: {
      waypoint_color_default: string;
      waypoint_color_selected: string;
      path_color: string;
      geofence_color: string;
      // Optional responsive map properties
      mobile_controls_size?: string;
      tablet_controls_size?: string;
      desktop_controls_size?: string;
    };
    button: {
      background_default: string;
      text_color_default: string;
      background_hover: string;
      background_accent: string;
      text_color_accent: string;
      // Optional responsive button properties
      mobile_height?: string;
      tablet_height?: string;
      desktop_height?: string;
      mobile_padding?: string;
      tablet_padding?: string;
      desktop_padding?: string;
    };
    plugin_card: {
      background: string;
      background_hover: string;
      icon_color: string;
      text_color: string;
      border_radius: string;
      // Optional responsive plugin card properties
      mobile_min_height?: string;
      tablet_min_height?: string;
      desktop_min_height?: string;
    };
    accordion: {
      background: string;
      border_color: string;
      header_text_color: string;
      // Optional responsive accordion properties
      mobile_width?: string;
      tablet_width?: string;
      desktop_width?: string;
    };
    hex_coin: {
      background: string;
      icon_color: string;
      border_color_default: string;
      border_color_pinned: string;
      snap_point_color: string;
      // Optional responsive hex coin properties
      mobile_size?: string;
      tablet_size?: string;
      desktop_size?: string;
    };
    sdr: {
      spectrum_line_color: string;
      spectrum_fill_color: string;
      waterfall_color_gradient: string;
      grid_line_color: string;
      axis_label_color: string;
      // Optional responsive SDR properties
      mobile_controls_width?: string;
      tablet_controls_width?: string;
      desktop_controls_width?: string;
    };
    // Optional dashboard component (responsive themes only)
    dashboard?: {
      mobile_columns?: string;
      tablet_columns?: string;
      desktop_columns?: string;
      mobile_gap?: string;
      tablet_gap?: string;
      desktop_gap?: string;
    };
  };
  animations: {
    transition_duration: string;
    easing_function: string;
    hover_scale: string;
    button_press_scale: string;
    // Optional responsive animation properties
    mobile_transition_duration?: string;
    reduced_motion_duration?: string;
  };
  // Optional responsive configuration section
  responsive?: {
    mobile?: {
      spacing_unit?: string;
      font_size_base?: string;
      font_size_sm?: string;
      font_size_lg?: string;
      touch_target_min?: string;
      panel_padding?: string;
      card_padding?: string;
    };
    tablet?: {
      spacing_unit?: string;
      font_size_base?: string;
      font_size_sm?: string;
      font_size_lg?: string;
      touch_target_min?: string;
      panel_padding?: string;
      card_padding?: string;
    };
    desktop?: {
      spacing_unit?: string;
      font_size_base?: string;
      font_size_sm?: string;
      font_size_lg?: string;
      touch_target_min?: string;
      panel_padding?: string;
      card_padding?: string;
    };
  };
  // Optional touch configuration section
  touch?: {
    tap_highlight_color?: string;
    scroll_behavior?: string;
    overscroll_behavior?: string;
    touch_action?: string;
  };
}

/**
 * Theme loading state interface
 */
export interface ThemeState {
  current: Theme | null;
  loading: boolean;
  error: string | null;
  lastLoaded: number;
}

/**
 * Theme loading options
 */
export interface ThemeLoadOptions {
  themeName?: string;
  fallbackTheme?: string;
  validateTheme?: boolean;
}
