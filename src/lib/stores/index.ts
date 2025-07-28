/**
 * Store exports for the Modular C2 Frontend
 * Centralized export point for all application stores
 */

// Theme store exports
export {
  theme,
  themeLoading,
  themeError,
  themeState,
  loadTheme,
  reloadTheme,
  setTheme,
  getThemeState,
  clearThemeError
} from './theme';

// Mission store exports
export {
  missionItems,
  selectedMissionItem,
  missionLoading,
  missionError,
  missionState,
  loadMissionData,
  updateWaypointParams,
  reorderMissionItem,
  selectMissionItem,
  addMissionItem,
  removeMissionItem,
  clearMissionError,
  getMissionState
} from './mission';

// Re-export theme types for convenience
export type { Theme, ThemeState, ThemeLoadOptions } from '../types/theme';

// Re-export mission types for convenience
export type { MissionItem, WaypointParams } from '../plugins/mission-planner/types';
