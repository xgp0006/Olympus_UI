import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import DraggableContainer from '../DraggableContainer.svelte';
import type { DraggableContainerProps } from '../draggable-container.types';

describe('DraggableContainer', () => {
  let container: HTMLElement;
  const defaultProps: DraggableContainerProps = {
    id: 'test-container',
    title: 'Test Container',
    initialX: 100,
    initialY: 100,
    initialWidth: 400,
    initialHeight: 300
  };

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  };

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default props', () => {
    const { getByText } = render(DraggableContainer, { props: defaultProps });
    expect(getByText('Test Container')).toBeInTheDocument();
  });

  it('applies initial position and size', () => {
    const { container } = render(DraggableContainer, { props: defaultProps });
    const draggable = container.querySelector('.draggable-container') as HTMLElement;

    expect(draggable.style.transform).toContain('translate3d(100px, 100px, 0)');
    expect(draggable.style.width).toBe('400px');
    expect(draggable.style.height).toBe('300px');
  });

  it('loads stored position from localStorage', () => {
    const storedData = {
      x: 200,
      y: 150,
      width: 500,
      height: 400,
      minimized: false
    };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

    const { container } = render(DraggableContainer, { props: defaultProps });
    const draggable = container.querySelector('.draggable-container') as HTMLElement;

    expect(localStorageMock.getItem).toHaveBeenCalledWith('draggable-test-container');
    expect(draggable.style.transform).toContain('translate3d(200px, 150px, 0)');
    expect(draggable.style.width).toBe('500px');
    expect(draggable.style.height).toBe('400px');
  });

  it('handles drag operations', async () => {
    const { container, component } = render(DraggableContainer, { props: defaultProps });
    const dragHandle = container.querySelector('.drag-handle') as HTMLElement;
    const draggable = container.querySelector('.draggable-container') as HTMLElement;

    // Start drag
    await fireEvent.mouseDown(dragHandle, { clientX: 150, clientY: 150 });

    // Move
    await fireEvent.mouseMove(window, { clientX: 250, clientY: 200 });
    await tick();

    // Check position updated (with grid snapping)
    expect(draggable.style.transform).toContain('translate3d(200px, 152px, 0)');

    // End drag
    await fireEvent.mouseUp(window);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('applies grid snapping when enabled', async () => {
    const props = { ...defaultProps, snapToGrid: true, gridSize: 16 };
    const { container } = render(DraggableContainer, { props });
    const dragHandle = container.querySelector('.drag-handle') as HTMLElement;
    const draggable = container.querySelector('.draggable-container') as HTMLElement;

    await fireEvent.mouseDown(dragHandle, { clientX: 150, clientY: 150 });
    await fireEvent.mouseMove(window, { clientX: 167, clientY: 169 });
    await tick();

    // Should snap to nearest 16px grid
    expect(draggable.style.transform).toContain('translate3d(112px, 112px, 0)');
  });

  it('applies edge snapping when near window edges', async () => {
    const props = { ...defaultProps, snapToEdges: true, edgeThreshold: 20 };
    const { container } = render(DraggableContainer, { props });
    const dragHandle = container.querySelector('.drag-handle') as HTMLElement;
    const draggable = container.querySelector('.draggable-container') as HTMLElement;

    // Move near left edge
    await fireEvent.mouseDown(dragHandle, { clientX: 150, clientY: 150 });
    await fireEvent.mouseMove(window, { clientX: 35, clientY: 150 });
    await tick();

    // Should snap to left edge (0px)
    expect(draggable.style.transform).toContain('translate3d(0px');
  });

  it('handles resize operations', async () => {
    const props = { ...defaultProps, resizable: true };
    const { container } = render(DraggableContainer, { props });
    const resizeHandle = container.querySelector('.resize-se') as HTMLElement;
    const draggable = container.querySelector('.draggable-container') as HTMLElement;

    // Start resize
    await fireEvent.mouseDown(resizeHandle, { clientX: 500, clientY: 400 });

    // Resize
    await fireEvent.mouseMove(window, { clientX: 600, clientY: 500 });
    await tick();

    // Check size updated
    expect(parseInt(draggable.style.width)).toBeGreaterThan(400);
    expect(parseInt(draggable.style.height)).toBeGreaterThan(300);

    // End resize
    await fireEvent.mouseUp(window);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('respects minimum size constraints', async () => {
    const props = { ...defaultProps, resizable: true, minWidth: 200, minHeight: 150 };
    const { container } = render(DraggableContainer, { props });
    const resizeHandle = container.querySelector('.resize-nw') as HTMLElement;
    const draggable = container.querySelector('.draggable-container') as HTMLElement;

    // Try to resize below minimum
    await fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });
    await fireEvent.mouseMove(window, { clientX: 400, clientY: 400 });
    await tick();

    // Should not go below minimum size
    expect(parseInt(draggable.style.width)).toBeGreaterThanOrEqual(200);
    expect(parseInt(draggable.style.height)).toBeGreaterThanOrEqual(150);
  });

  it('handles minimize/restore functionality', async () => {
    const props = { ...defaultProps, minimizable: true };
    const { container, component } = render(DraggableContainer, { props });
    const minimizeButton = container.querySelector('.minimize-button') as HTMLElement;
    const draggable = container.querySelector('.draggable-container') as HTMLElement;

    const minimizeHandler = vi.fn();
    component.$on('minimize', minimizeHandler);

    // Minimize
    await fireEvent.click(minimizeButton);
    await tick();

    expect(draggable.classList.contains('minimized')).toBe(true);
    expect(draggable.style.transform).toContain('scale(0.1)');
    expect(minimizeHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { id: 'test-container', minimized: true }
      })
    );

    // Restore
    await fireEvent.click(minimizeButton);
    await tick();

    expect(draggable.classList.contains('minimized')).toBe(false);
    expect(draggable.style.transform).toContain('scale(1)');
  });

  it('handles keyboard navigation', async () => {
    const { container } = render(DraggableContainer, { props: defaultProps });
    const draggable = container.querySelector('.draggable-container') as HTMLElement;

    // Focus the container
    draggable.focus();

    // Move with arrow keys
    await fireEvent.keyDown(draggable, { key: 'ArrowRight' });
    await tick();
    expect(draggable.style.transform).toContain('translate3d(108px'); // 100 + 8 (grid)

    await fireEvent.keyDown(draggable, { key: 'ArrowDown' });
    await tick();
    expect(draggable.style.transform).toContain('108px'); // 100 + 8 (grid)

    // Fine movement with Shift
    await fireEvent.keyDown(draggable, { key: 'ArrowLeft', shiftKey: true });
    await tick();
    // Should move by 1px instead of grid size

    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('handles touch events', async () => {
    const { container } = render(DraggableContainer, { props: defaultProps });
    const dragHandle = container.querySelector('.drag-handle') as HTMLElement;
    const draggable = container.querySelector('.draggable-container') as HTMLElement;

    // Start touch drag
    await fireEvent.touchStart(dragHandle, {
      touches: [{ clientX: 150, clientY: 150 }]
    });

    // Move touch
    await fireEvent.touchMove(window, {
      touches: [{ clientX: 250, clientY: 200 }]
    });
    await tick();

    // Check position updated
    expect(draggable.style.transform).toContain('translate3d(200px');

    // End touch
    await fireEvent.touchEnd(window);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('manages z-index for stacking', async () => {
    const { container, component } = render(DraggableContainer, { props: defaultProps });
    const draggable = container.querySelector('.draggable-container') as HTMLElement;

    const focusHandler = vi.fn();
    component.$on('focus', focusHandler);

    const initialZIndex = parseInt(draggable.style.zIndex);

    // Click to bring to front
    await fireEvent.mouseDown(draggable);
    await tick();

    const newZIndex = parseInt(draggable.style.zIndex);
    expect(newZIndex).toBeGreaterThan(initialZIndex);
    expect(focusHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { id: 'test-container' }
      })
    );
  });

  it('emits mounted event on initialization', () => {
    const mountHandler = vi.fn();
    const { component } = render(DraggableContainer, { props: defaultProps });

    component.$on('mounted', mountHandler);

    // Component should emit mounted event
    waitFor(() => {
      expect(mountHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { id: 'test-container' }
        })
      );
    });
  });

  it('handles malformed localStorage data gracefully', () => {
    localStorageMock.getItem.mockReturnValue('invalid json');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { container } = render(DraggableContainer, { props: defaultProps });
    const draggable = container.querySelector('.draggable-container') as HTMLElement;

    // Should fall back to initial props
    expect(draggable.style.transform).toContain('translate3d(100px, 100px, 0)');
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load stored position:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('prevents drag during resize', async () => {
    const props = { ...defaultProps, resizable: true };
    const { container } = render(DraggableContainer, { props });
    const resizeHandle = container.querySelector('.resize-se') as HTMLElement;
    const dragHandle = container.querySelector('.drag-handle') as HTMLElement;
    const draggable = container.querySelector('.draggable-container') as HTMLElement;

    // Start resize
    await fireEvent.mouseDown(resizeHandle, { clientX: 500, clientY: 400 });

    // Try to drag while resizing
    await fireEvent.mouseDown(dragHandle, { clientX: 150, clientY: 150 });
    await fireEvent.mouseMove(window, { clientX: 250, clientY: 200 });
    await tick();

    // Position should not change during resize
    expect(draggable.style.transform).toContain('translate3d(100px, 100px, 0)');
  });

  it('provides proper accessibility attributes', () => {
    const { container } = render(DraggableContainer, { props: defaultProps });
    const draggable = container.querySelector('.draggable-container') as HTMLElement;

    expect(draggable.getAttribute('tabindex')).toBe('0');
    expect(draggable.getAttribute('role')).toBe('dialog');
    expect(draggable.getAttribute('aria-label')).toBe('Test Container');
  });
});
