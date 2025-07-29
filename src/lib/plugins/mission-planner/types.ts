/**
 * Mission Planner plugin type definitions
 * Requirements: 4.2, 4.4, 4.8, 4.9
 */

export interface WaypointParams {
  lat?: number;
  lng?: number;
  alt?: number;
  speed?: number;
  action?: string;
  hold_time?: number;
  acceptance_radius?: number;
  pass_radius?: number;
  yaw_angle?: number;
  min_pitch?: number;
  abort_alt?: number;
  precision_land?: boolean;
}

export interface MissionItem {
  id: string;
  type: 'takeoff' | 'waypoint' | 'loiter' | 'land';
  name: string;
  sequence?: number;
  lat?: number;
  lng?: number;
  altitude?: number;
  params: WaypointParams;
  position?: {
    lat: number;
    lng: number;
    alt: number;
  };
  description?: string;
}

export interface MapViewerProps {
  selectedItemId?: string | null;
  missionItems?: MissionItem[];
  center?: [number, number];
  zoom?: number;
}

export interface MapClickEvent {
  lngLat: [number, number];
  point: [number, number];
  isLongPress?: boolean;
}
