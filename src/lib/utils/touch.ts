/**
 * Advanced Touch and Gesture Utilities for Mission Planner
 * Provides comprehensive touch interaction support for aerospace applications
 * Requirements: 1.8, 4.5, 4.6
 */

import { BoundedArray } from './bounded-array'; // NASA JPL Rule 2

// ===== TOUCH EVENT TYPES =====

export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
  identifier: number;
}

export interface GestureState {
  isActive: boolean;
  startTime: number;
  startPoints: TouchPoint[];
  currentPoints: TouchPoint[];
  lastPoints: TouchPoint[];
}

export interface SwipeGesture {
  direction: 'up' | 'down' | 'left' | 'right';
  distance: number;
  duration: number;
  velocity: number;
  startPoint: TouchPoint;
  endPoint: TouchPoint;
}

export interface PinchGesture {
  scale: number;
  rotation: number;
  center: { x: number; y: number };
  distance: number;
  startDistance: number;
}

export interface PanGesture {
  deltaX: number;
  deltaY: number;
  totalDeltaX: number;
  totalDeltaY: number;
  velocity: { x: number; y: number };
}

export interface TapGesture {
  point: TouchPoint;
  tapCount: number;
  duration: number;
}

export interface LongPressGesture {
  point: TouchPoint;
  duration: number;
}

// ===== GESTURE RECOGNITION =====

export class TouchGestureRecognizer {
  // NASA JPL Rule 2: Bounded memory allocation for touch points
  private readonly MAX_TOUCH_POINTS = 10; // Support up to 10 concurrent touches
  private readonly startPointsPool = new BoundedArray<TouchPoint>(this.MAX_TOUCH_POINTS);
  private readonly currentPointsPool = new BoundedArray<TouchPoint>(this.MAX_TOUCH_POINTS);
  private readonly lastPointsPool = new BoundedArray<TouchPoint>(this.MAX_TOUCH_POINTS);

  private gestureState: GestureState = {
    isActive: false,
    startTime: 0,
    startPoints: this.startPointsPool.toArray(), // NASA JPL Rule 2: Bounded
    currentPoints: this.currentPointsPool.toArray(), // NASA JPL Rule 2: Bounded
    lastPoints: this.lastPointsPool.toArray() // NASA JPL Rule 2: Bounded
  };

  private tapTimeout: ReturnType<typeof setTimeout> | null = null;
  private longPressTimeout: ReturnType<typeof setTimeout> | null = null;
  private tapCount = 0;
  private lastTapTime = 0;

  // Configuration
  private readonly config = {
    tapMaxDuration: 300,
    tapMaxDistance: 10,
    doubleTapMaxDelay: 300,
    longPressMinDuration: 500,
    swipeMinDistance: 50,
    swipeMaxTime: 1000,
    panMinDistance: 5,
    pinchMinDistance: 10
  };

  // Event callbacks
  private onSwipe?: (gesture: SwipeGesture) => void;
  private onPinch?: (gesture: PinchGesture) => void;
  private onPan?: (gesture: PanGesture) => void;
  private onTap?: (gesture: TapGesture) => void;
  private onDoubleTap?: (gesture: TapGesture) => void;
  private onLongPress?: (gesture: LongPressGesture) => void;
  private onGestureStart?: () => void;
  private onGestureEnd?: () => void;

  constructor(callbacks: {
    onSwipe?: (gesture: SwipeGesture) => void;
    onPinch?: (gesture: PinchGesture) => void;
    onPan?: (gesture: PanGesture) => void;
    onTap?: (gesture: TapGesture) => void;
    onDoubleTap?: (gesture: TapGesture) => void;
    onLongPress?: (gesture: LongPressGesture) => void;
    onGestureStart?: () => void;
    onGestureEnd?: () => void;
  }) {
    this.onSwipe = callbacks.onSwipe;
    this.onPinch = callbacks.onPinch;
    this.onPan = callbacks.onPan;
    this.onTap = callbacks.onTap;
    this.onDoubleTap = callbacks.onDoubleTap;
    this.onLongPress = callbacks.onLongPress;
    this.onGestureStart = callbacks.onGestureStart;
    this.onGestureEnd = callbacks.onGestureEnd;
  }

  /**
   * Handle touch start event
   */
  handleTouchStart(event: TouchEvent): void {
    event.preventDefault();

    const touches = Array.from(event.touches).map(this.touchToPoint);
    const now = Date.now();

    this.gestureState = {
      isActive: true,
      startTime: now,
      startPoints: [...touches],
      currentPoints: [...touches],
      lastPoints: [...touches]
    };

    // Clear existing timeouts
    this.clearTimeouts();

    // Start long press detection for single touch
    if (touches.length === 1) {
      this.longPressTimeout = window.setTimeout(() => {
        if (this.gestureState.isActive && this.gestureState.currentPoints.length === 1) {
          const point = this.gestureState.currentPoints[0];
          const startPoint = this.gestureState.startPoints[0];
          const distance = this.calculateDistance(point, startPoint);

          if (distance < this.config.tapMaxDistance) {
            this.onLongPress?.({
              point,
              duration: now - this.gestureState.startTime
            });
          }
        }
      }, this.config.longPressMinDuration);
    }

    this.onGestureStart?.();
  }

  /**
   * Handle touch move event
   */
  handleTouchMove(event: TouchEvent): void {
    if (!this.gestureState.isActive) return;

    event.preventDefault();

    const touches = Array.from(event.touches).map(this.touchToPoint);
    this.gestureState.lastPoints = [...this.gestureState.currentPoints];
    this.gestureState.currentPoints = [...touches];

    // Clear long press timeout on movement
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }

    // Handle different gesture types based on touch count
    if (touches.length === 1) {
      this.handleSingleTouchMove();
    } else if (touches.length === 2) {
      this.handleTwoTouchMove();
    }
  }

  /**
   * Handle touch end event
   */
  handleTouchEnd(event: TouchEvent): void {
    if (!this.gestureState.isActive) return;

    const now = Date.now();
    const duration = now - this.gestureState.startTime;
    const remainingTouches = Array.from(event.touches).map(this.touchToPoint);

    // Clear timeouts
    this.clearTimeouts();

    // Handle gesture completion based on remaining touches
    if (remainingTouches.length === 0) {
      // All touches ended
      this.handleGestureComplete(duration);
      this.gestureState.isActive = false;
      this.onGestureEnd?.();
    } else {
      // Some touches remain, update state
      this.gestureState.currentPoints = [...remainingTouches];
      this.gestureState.lastPoints = [...remainingTouches];
    }
  }

  /**
   * Handle single touch movement (pan/swipe)
   */
  private handleSingleTouchMove(): void {
    const current = this.gestureState.currentPoints[0];
    const start = this.gestureState.startPoints[0];
    const last = this.gestureState.lastPoints[0];

    const totalDeltaX = current.x - start.x;
    const totalDeltaY = current.y - start.y;
    const deltaX = current.x - last.x;
    const deltaY = current.y - last.y;

    const timeDelta = current.timestamp - last.timestamp;
    const velocity = {
      x: timeDelta > 0 ? deltaX / timeDelta : 0,
      y: timeDelta > 0 ? deltaY / timeDelta : 0
    };

    // Emit pan gesture if movement is significant
    const totalDistance = Math.sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY);
    if (totalDistance > this.config.panMinDistance) {
      this.onPan?.({
        deltaX,
        deltaY,
        totalDeltaX,
        totalDeltaY,
        velocity
      });
    }
  }

  /**
   * Handle two touch movement (pinch/rotate)
   */
  private handleTwoTouchMove(): void {
    const [current1, current2] = this.gestureState.currentPoints;
    const [start1, start2] = this.gestureState.startPoints;

    // Calculate current distance and center
    const currentDistance = this.calculateDistance(current1, current2);
    const startDistance = this.calculateDistance(start1, start2);
    const center = {
      x: (current1.x + current2.x) / 2,
      y: (current1.y + current2.y) / 2
    };

    // Calculate scale
    const scale = startDistance > 0 ? currentDistance / startDistance : 1;

    // Calculate rotation
    const startAngle = Math.atan2(start2.y - start1.y, start2.x - start1.x);
    const currentAngle = Math.atan2(current2.y - current1.y, current2.x - current1.x);
    const rotation = currentAngle - startAngle;

    // Emit pinch gesture if change is significant
    if (Math.abs(scale - 1) > 0.1 || Math.abs(rotation) > 0.1) {
      this.onPinch?.({
        scale,
        rotation,
        center,
        distance: currentDistance,
        startDistance
      });
    }
  }

  /**
   * Handle gesture completion
   */
  private handleGestureComplete(duration: number): void {
    const startPoint = this.gestureState.startPoints[0];
    const endPoint = this.gestureState.currentPoints[0];

    if (!startPoint || !endPoint) return;

    const distance = this.calculateDistance(startPoint, endPoint);

    // Check for tap
    if (duration < this.config.tapMaxDuration && distance < this.config.tapMaxDistance) {
      this.handleTap(endPoint, duration);
      return;
    }

    // Check for swipe
    if (distance > this.config.swipeMinDistance && duration < this.config.swipeMaxTime) {
      this.handleSwipe(startPoint, endPoint, duration);
    }
  }

  /**
   * Handle tap gesture
   */
  private handleTap(point: TouchPoint, duration: number): void {
    const now = Date.now();
    const timeSinceLastTap = now - this.lastTapTime;

    if (timeSinceLastTap < this.config.doubleTapMaxDelay) {
      // Double tap
      this.tapCount++;
      if (this.tapCount === 2) {
        this.onDoubleTap?.({
          point,
          tapCount: 2,
          duration
        });
        this.tapCount = 0;
        return;
      }
    } else {
      this.tapCount = 1;
    }

    this.lastTapTime = now;

    // Set timeout for single tap
    this.tapTimeout = window.setTimeout(() => {
      if (this.tapCount === 1) {
        this.onTap?.({
          point,
          tapCount: 1,
          duration
        });
      }
      this.tapCount = 0;
    }, this.config.doubleTapMaxDelay);
  }

  /**
   * Handle swipe gesture
   */
  private handleSwipe(startPoint: TouchPoint, endPoint: TouchPoint, duration: number): void {
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;

    let direction: SwipeGesture['direction'];
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    this.onSwipe?.({
      direction,
      distance,
      duration,
      velocity,
      startPoint,
      endPoint
    });
  }

  /**
   * Convert Touch to TouchPoint
   */
  private touchToPoint(touch: Touch): TouchPoint {
    return {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
      identifier: touch.identifier
    };
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(p1: TouchPoint, p2: TouchPoint): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  /**
   * Clear all timeouts
   */
  private clearTimeouts(): void {
    if (this.tapTimeout) {
      clearTimeout(this.tapTimeout);
      this.tapTimeout = null;
    }
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearTimeouts();
    this.gestureState.isActive = false;
  }
}

// ===== TOUCH-OPTIMIZED COMPONENT UTILITIES =====

/**
 * Add touch gesture support to an element
 */
export function addTouchGestures(
  element: HTMLElement,
  callbacks: {
    onSwipe?: (gesture: SwipeGesture) => void;
    onPinch?: (gesture: PinchGesture) => void;
    onPan?: (gesture: PanGesture) => void;
    onTap?: (gesture: TapGesture) => void;
    onDoubleTap?: (gesture: TapGesture) => void;
    onLongPress?: (gesture: LongPressGesture) => void;
    onGestureStart?: () => void;
    onGestureEnd?: () => void;
  }
): () => void {
  const recognizer = new TouchGestureRecognizer(callbacks);

  const handleTouchStart = (e: TouchEvent) => recognizer.handleTouchStart(e);
  const handleTouchMove = (e: TouchEvent) => recognizer.handleTouchMove(e);
  const handleTouchEnd = (e: TouchEvent) => recognizer.handleTouchEnd(e);

  element.addEventListener('touchstart', handleTouchStart, { passive: false });
  element.addEventListener('touchmove', handleTouchMove, { passive: false });
  element.addEventListener('touchend', handleTouchEnd, { passive: false });
  element.addEventListener('touchcancel', handleTouchEnd, { passive: false });

  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);
    element.removeEventListener('touchcancel', handleTouchEnd);
    recognizer.destroy();
  };
}

/**
 * Create touch-optimized drag handler
 */
export function createTouchDragHandler(
  element: HTMLElement,
  callbacks: {
    onDragStart?: (point: TouchPoint) => void;
    onDrag?: (gesture: PanGesture) => void;
    onDragEnd?: (point: TouchPoint) => void;
  }
): () => void {
  return addTouchGestures(element, {
    onGestureStart: () => {
      const touches = Array.from((event as TouchEvent).touches);
      if (touches.length === 1) {
        const point = {
          x: touches[0].clientX,
          y: touches[0].clientY,
          timestamp: Date.now(),
          identifier: touches[0].identifier
        };
        callbacks.onDragStart?.(point);
      }
    },
    onPan: callbacks.onDrag,
    onGestureEnd: () => {
      const touches = Array.from((event as TouchEvent).changedTouches);
      if (touches.length === 1) {
        const point = {
          x: touches[0].clientX,
          y: touches[0].clientY,
          timestamp: Date.now(),
          identifier: touches[0].identifier
        };
        callbacks.onDragEnd?.(point);
      }
    }
  });
}

/**
 * Enhance button with touch feedback
 */
export function enhanceButtonTouch(
  button: HTMLElement,
  options: {
    hapticFeedback?: boolean;
    visualFeedback?: boolean;
    preventDoubleClick?: boolean;
  } = {}
): () => void {
  let isPressed = false;
  let pressTimeout: ReturnType<typeof setTimeout> | null = null;

  const handleTouchStart = () => {
    if (isPressed) return;

    isPressed = true;

    // Visual feedback
    if (options.visualFeedback !== false) {
      button.style.transform = 'scale(0.95)';
      button.style.opacity = '0.8';
    }

    // Haptic feedback (if supported)
    if (options.hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleTouchEnd = () => {
    if (!isPressed) return;

    isPressed = false;

    // Reset visual feedback
    if (options.visualFeedback !== false) {
      button.style.transform = '';
      button.style.opacity = '';
    }

    // Prevent double-click if requested
    if (options.preventDoubleClick) {
      button.style.pointerEvents = 'none';
      pressTimeout = window.setTimeout(() => {
        button.style.pointerEvents = '';
      }, 300);
    }
  };

  button.addEventListener('touchstart', handleTouchStart, { passive: true });
  button.addEventListener('touchend', handleTouchEnd, { passive: true });
  button.addEventListener('touchcancel', handleTouchEnd, { passive: true });

  return () => {
    button.removeEventListener('touchstart', handleTouchStart);
    button.removeEventListener('touchend', handleTouchEnd);
    button.removeEventListener('touchcancel', handleTouchEnd);

    if (pressTimeout) {
      clearTimeout(pressTimeout);
    }
  };
}
