/**
 * Mission Planner plugin type definitions
 * Requirements: 4.2, 4.4, 4.8, 4.9
 */

export interface WaypointParams {
  lat: number;
  lng: number;
  alt: number;
  speed?: number;
  action?: string;
}

export interface MissionItem {
  id: string;
  type: 'takeoff' | 'waypoint' | 'loiter' | 'land';
  name: string;
  params: WaypointParams;
  position?: {
    lat: number;
    lng: number;
    alt: number;
  };
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
