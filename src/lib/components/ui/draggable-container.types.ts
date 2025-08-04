export interface DraggableContainerProps {
  id: string;
  title?: string;
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  snapToGrid?: boolean;
  gridSize?: number;
  snapToEdges?: boolean;
  edgeThreshold?: number;
  resizable?: boolean;
  minimizable?: boolean;
  zIndex?: number;
}

export interface DraggablePosition {
  x: number;
  y: number;
}

export interface DraggableSize {
  width: number;
  height: number;
}

export interface DraggableState {
  position: DraggablePosition;
  size: DraggableSize;
  minimized: boolean;
}

export interface DraggableEvents {
  mounted: { id: string };
  focus: { id: string };
  minimize: { id: string; minimized: boolean };
}

export type ResizeHandle = 'n' | 'e' | 's' | 'w' | 'ne' | 'se' | 'sw' | 'nw';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  lastUpdate: number;
}
