/**
 * Event Testing Helpers
 * Utilities for testing user interactions and events
 */

import { fireEvent } from '@testing-library/svelte';
import { vi } from 'vitest';

/**
 * Simulate keyboard shortcut
 */
export async function simulateKeyboardShortcut(
  element: HTMLElement,
  shortcut: {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
  }
): Promise<void> {
  await fireEvent.keyDown(element, {
    key: shortcut.key,
    ctrlKey: shortcut.ctrlKey || false,
    shiftKey: shortcut.shiftKey || false,
    altKey: shortcut.altKey || false,
    metaKey: shortcut.metaKey || false
  });
}

/**
 * Simulate typing text
 */
export async function simulateTyping(
  input: HTMLInputElement | HTMLTextAreaElement,
  text: string,
  delay = 0
): Promise<void> {
  input.focus();
  
  for (const char of text) {
    await fireEvent.keyDown(input, { key: char });
    await fireEvent.input(input, { target: { value: input.value + char } });
    
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Simulate form submission
 */
export async function simulateFormSubmission(form: HTMLFormElement): Promise<void> {
  await fireEvent.submit(form);
}

/**
 * Simulate drag and drop
 */
export async function simulateDragAndDrop(
  source: HTMLElement,
  target: HTMLElement,
  dataTransfer?: Record<string, string>
): Promise<void> {
  const dragStartEvent = new DragEvent('dragstart', {
    bubbles: true,
    cancelable: true,
    dataTransfer: new DataTransfer()
  });

  if (dataTransfer) {
    Object.entries(dataTransfer).forEach(([key, value]) => {
      dragStartEvent.dataTransfer?.setData(key, value);
    });
  }

  await fireEvent(source, dragStartEvent);
  
  await fireEvent.dragEnter(target);
  await fireEvent.dragOver(target);
  
  const dropEvent = new DragEvent('drop', {
    bubbles: true,
    cancelable: true,
    dataTransfer: dragStartEvent.dataTransfer
  });
  
  await fireEvent(target, dropEvent);
  await fireEvent.dragEnd(source);
}

/**
 * Simulate mouse hover
 */
export async function simulateHover(element: HTMLElement): Promise<void> {
  await fireEvent.mouseEnter(element);
  await fireEvent.mouseOver(element);
}

/**
 * Simulate mouse leave
 */
export async function simulateMouseLeave(element: HTMLElement): Promise<void> {
  await fireEvent.mouseLeave(element);
  await fireEvent.mouseOut(element);
}

/**
 * Simulate double click
 */
export async function simulateDoubleClick(element: HTMLElement): Promise<void> {
  await fireEvent.click(element);
  await fireEvent.click(element);
  await fireEvent.doubleClick(element);
}

/**
 * Simulate right click (context menu)
 */
export async function simulateRightClick(element: HTMLElement): Promise<void> {
  await fireEvent.contextMenu(element);
}

/**
 * Simulate touch events
 */
export async function simulateTouch(
  element: HTMLElement,
  touches: Array<{ clientX: number; clientY: number }>
): Promise<void> {
  const touchList = touches.map((touch, index) => ({
    identifier: index,
    target: element,
    clientX: touch.clientX,
    clientY: touch.clientY,
    pageX: touch.clientX,
    pageY: touch.clientY,
    screenX: touch.clientX,
    screenY: touch.clientY,
    radiusX: 10,
    radiusY: 10,
    rotationAngle: 0,
    force: 1
  }));

  await fireEvent.touchStart(element, { touches: touchList });
}

/**
 * Simulate touch end
 */
export async function simulateTouchEnd(element: HTMLElement): Promise<void> {
  await fireEvent.touchEnd(element, { touches: [] });
}

/**
 * Simulate pinch gesture
 */
export async function simulatePinch(
  element: HTMLElement,
  startDistance: number,
  endDistance: number
): Promise<void> {
  // Start with two touches
  await simulateTouch(element, [
    { clientX: 100, clientY: 100 },
    { clientX: 100 + startDistance, clientY: 100 }
  ]);

  // Move touches to simulate pinch
  await fireEvent.touchMove(element, {
    touches: [
      { clientX: 100, clientY: 100 },
      { clientX: 100 + endDistance, clientY: 100 }
    ]
  });

  await simulateTouchEnd(element);
}

/**
 * Simulate scroll event
 */
export async function simulateScroll(
  element: HTMLElement,
  scrollTop: number,
  scrollLeft = 0
): Promise<void> {
  Object.defineProperty(element, 'scrollTop', {
    value: scrollTop,
    writable: true
  });
  
  Object.defineProperty(element, 'scrollLeft', {
    value: scrollLeft,
    writable: true
  });

  await fireEvent.scroll(element);
}

/**
 * Simulate resize event
 */
export async function simulateResize(
  element: HTMLElement,
  width: number,
  height: number
): Promise<void> {
  // Mock getBoundingClientRect
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    width,
    height,
    top: 0,
    left: 0,
    bottom: height,
    right: width,
    x: 0,
    y: 0,
    toJSON: () => ({})
  });

  // Dispatch resize event
  const resizeEvent = new Event('resize');
  await fireEvent(element, resizeEvent);
}

/**
 * Simulate focus and blur events
 */
export async function simulateFocus(element: HTMLElement): Promise<void> {
  element.focus();
  await fireEvent.focus(element);
}

export async function simulateBlur(element: HTMLElement): Promise<void> {
  element.blur();
  await fireEvent.blur(element);
}

/**
 * Simulate clipboard operations
 */
export async function simulatePaste(
  element: HTMLElement,
  text: string
): Promise<void> {
  const clipboardData = new DataTransfer();
  clipboardData.setData('text/plain', text);

  const pasteEvent = new ClipboardEvent('paste', {
    clipboardData,
    bubbles: true,
    cancelable: true
  });

  await fireEvent(element, pasteEvent);
}

export async function simulateCopy(element: HTMLElement): Promise<void> {
  const copyEvent = new ClipboardEvent('copy', {
    bubbles: true,
    cancelable: true
  });

  await fireEvent(element, copyEvent);
}

/**
 * Simulate file drop
 */
export async function simulateFileDrop(
  element: HTMLElement,
  files: File[]
): Promise<void> {
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));

  const dropEvent = new DragEvent('drop', {
    bubbles: true,
    cancelable: true,
    dataTransfer
  });

  await fireEvent(element, dropEvent);
}

/**
 * Create mock file for testing
 */
export function createMockFile(
  name: string,
  content: string,
  type = 'text/plain'
): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

/**
 * Simulate window events
 */
export async function simulateWindowResize(width: number, height: number): Promise<void> {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height
  });

  await fireEvent(window, new Event('resize'));
}

/**
 * Simulate visibility change
 */
export async function simulateVisibilityChange(hidden: boolean): Promise<void> {
  Object.defineProperty(document, 'hidden', {
    writable: true,
    configurable: true,
    value: hidden
  });

  Object.defineProperty(document, 'visibilityState', {
    writable: true,
    configurable: true,
    value: hidden ? 'hidden' : 'visible'
  });

  await fireEvent(document, new Event('visibilitychange'));
}

/**
 * Simulate network status change
 */
export async function simulateNetworkChange(online: boolean): Promise<void> {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    configurable: true,
    value: online
  });

  const eventType = online ? 'online' : 'offline';
  await fireEvent(window, new Event(eventType));
}

/**
 * Wait for event and return event data
 */
export async function captureEvent(
  element: HTMLElement,
  eventType: string,
  timeout = 5000
): Promise<Event> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      element.removeEventListener(eventType, handler);
      reject(new Error(`Event "${eventType}" was not captured within ${timeout}ms`));
    }, timeout);

    const handler = (event: Event) => {
      clearTimeout(timeoutId);
      element.removeEventListener(eventType, handler);
      resolve(event);
    };

    element.addEventListener(eventType, handler);
  });
}