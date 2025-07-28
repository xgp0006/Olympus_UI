/**
 * Theme system type definitions for the Modular C2 Frontend
 * Defines the complete theme interface structure based on requirements 3.1, 3.2, 3.3
 */

export interface Theme {
  name: string;
  metadata: {
    author: string;
    version: string;
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
  };
  layout: {
    border_radius: string;
    border_width: string;
    spacing_unit: string;
  };
  components: {
    cli: {
      background: string;
      text_color: string;
      cursor_color: string;
      cursor_shape: string;
    };
    map: {
      waypoint_color_default: string;
      waypoint_color_selected: string;
      path_color: string;
      geofence_color: string;
    };
    button: {
      background_default: string;
      text_color_default: string;
      background_hover: string;
      background_accent: string;
      text_color_accent: string;
    };
    plugin_card: {
      background: string;
      background_hover: string;
      icon_color: string;
      text_color: string;
      border_radius: string;
    };
    accordion: {
      background: string;
      border_color: string;
      header_text_color: string;
    };
    hex_coin: {
      background: string;
      icon_color: string;
      border_color_default: string;
      border_color_pinned: string;
      snap_point_color: string;
    };
    sdr: {
      spectrum_line_color: string;
      spectrum_fill_color: string;
      waterfall_color_gradient: string;
      grid_line_color: string;
      axis_label_color: string;
    };
  };
  animations: {
    transition_duration: string;
    easing_function: string;
    hover_scale: string;
    button_press_scale: string;
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
