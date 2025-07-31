<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { spring } from 'svelte/motion';

	// Props
	export let id: string;
	export let title = '';
	export let initialX = 100;
	export let initialY = 100;
	export let initialWidth = 400;
	export let initialHeight = 300;
	export let minWidth = 200;
	export let minHeight = 150;
	export let snapToGrid = true;
	export let gridSize = 8;
	export let snapToEdges = true;
	export let edgeThreshold = 20;
	export let resizable = true;
	export let minimizable = true;
	export let zIndex = 1000;

	// State
	let container: HTMLElement;
	let isDragging = false;
	let isResizing = false;
	let isMinimized = false;
	let dragStartX = 0;
	let dragStartY = 0;
	let resizeStartX = 0;
	let resizeStartY = 0;
	let resizeStartWidth = 0;
	let resizeStartHeight = 0;
	let activeResizeHandle = '';

	// Spring animations for smooth transitions
	const position = spring({ x: initialX, y: initialY }, {
		stiffness: 0.2,
		damping: 0.8
	});

	const size = spring({ width: initialWidth, height: initialHeight }, {
		stiffness: 0.2,
		damping: 0.8
	});

	const minimizeScale = spring(1, {
		stiffness: 0.3,
		damping: 0.9
	});

	// Z-index management
	let containerZIndex = zIndex;
	const dispatch = createEventDispatcher();

	// NASA JPL compliant function: Initialize component
	function initializeComponent(): void {
		loadStoredPosition();
		setupKeyboardNavigation();
		dispatch('mounted', { id });
	}

	// NASA JPL compliant function: Load position from localStorage
	function loadStoredPosition(): void {
		const stored = localStorage.getItem(`draggable-${id}`);
		if (!stored) return;

		try {
			const data = JSON.parse(stored);
			position.set({ x: data.x || initialX, y: data.y || initialY });
			size.set({ 
				width: data.width || initialWidth, 
				height: data.height || initialHeight 
			});
			isMinimized = data.minimized || false;
			if (isMinimized) minimizeScale.set(0.1);
		} catch (e) {
			console.error('Failed to load stored position:', e);
		}
	}

	// NASA JPL compliant function: Save position to localStorage
	function savePosition(): void {
		const data = {
			x: $position.x,
			y: $position.y,
			width: $size.width,
			height: $size.height,
			minimized: isMinimized
		};
		localStorage.setItem(`draggable-${id}`, JSON.stringify(data));
	}

	// NASA JPL compliant function: Handle drag start
	function handleDragStart(e: MouseEvent | TouchEvent): void {
		if (isMinimized || isResizing) return;

		isDragging = true;
		bringToFront();

		const point = getEventPoint(e);
		dragStartX = point.x - $position.x;
		dragStartY = point.y - $position.y;

		e.preventDefault();
	}

	// NASA JPL compliant function: Handle focus events
	function handleFocus(): void {
		bringToFront();
	}

	// NASA JPL compliant function: Handle drag move
	function handleDragMove(e: MouseEvent | TouchEvent): void {
		if (!isDragging) return;

		const point = getEventPoint(e);
		let newX = point.x - dragStartX;
		let newY = point.y - dragStartY;

		// Apply grid snapping
		if (snapToGrid) {
			newX = Math.round(newX / gridSize) * gridSize;
			newY = Math.round(newY / gridSize) * gridSize;
		}

		// Apply edge snapping
		if (snapToEdges) {
			const snap = calculateEdgeSnap(newX, newY);
			newX = snap.x;
			newY = snap.y;
		}

		position.set({ x: newX, y: newY });
		e.preventDefault();
	}

	// NASA JPL compliant function: Calculate edge snapping
	function calculateEdgeSnap(x: number, y: number): { x: number; y: number } {
		const windowWidth = window.innerWidth;
		const windowHeight = window.innerHeight;
		const width = $size.width;
		const height = $size.height;

		// Snap to left/right edges
		if (x < edgeThreshold) x = 0;
		if (x + width > windowWidth - edgeThreshold) {
			x = windowWidth - width;
		}

		// Snap to top/bottom edges
		if (y < edgeThreshold) y = 0;
		if (y + height > windowHeight - edgeThreshold) {
			y = windowHeight - height;
		}

		return { x, y };
	}

	// NASA JPL compliant function: Handle resize start
	function handleResizeStart(handle: string) {
		return (e: MouseEvent | TouchEvent): void => {
			if (isMinimized) return;

			isResizing = true;
			activeResizeHandle = handle;
			bringToFront();

			const point = getEventPoint(e);
			resizeStartX = point.x;
			resizeStartY = point.y;
			resizeStartWidth = $size.width;
			resizeStartHeight = $size.height;

			e.preventDefault();
			e.stopPropagation();
		};
	}

	// NASA JPL compliant function: Handle resize move
	function handleResizeMove(e: MouseEvent | TouchEvent): void {
		if (!isResizing) return;

		const point = getEventPoint(e);
		const deltaX = point.x - resizeStartX;
		const deltaY = point.y - resizeStartY;

		const newSize = calculateNewSize(deltaX, deltaY);
		size.set(newSize);
		e.preventDefault();
	}

	// NASA JPL compliant function: Calculate new size during resize
	function calculateNewSize(deltaX: number, deltaY: number): { width: number; height: number } {
		let width = resizeStartWidth;
		let height = resizeStartHeight;

		// Handle different resize handles
		if (activeResizeHandle.includes('e')) width += deltaX;
		if (activeResizeHandle.includes('w')) width -= deltaX;
		if (activeResizeHandle.includes('s')) height += deltaY;
		if (activeResizeHandle.includes('n')) height -= deltaY;

		// Apply constraints
		width = Math.max(minWidth, width);
		height = Math.max(minHeight, height);

		// Apply grid snapping
		if (snapToGrid) {
			width = Math.round(width / gridSize) * gridSize;
			height = Math.round(height / gridSize) * gridSize;
		}

		return { width, height };
	}

	// NASA JPL compliant function: Handle drag/resize end
	function handleEnd(): void {
		if (isDragging || isResizing) {
			isDragging = false;
			isResizing = false;
			activeResizeHandle = '';
			savePosition();
		}
	}

	// NASA JPL compliant function: Toggle minimize state
	function toggleMinimize(): void {
		isMinimized = !isMinimized;
		minimizeScale.set(isMinimized ? 0.1 : 1);
		savePosition();
		dispatch('minimize', { id, minimized: isMinimized });
	}

	// NASA JPL compliant function: Bring container to front
	function bringToFront(): void {
		containerZIndex = Date.now();
		dispatch('focus', { id });
	}

	// NASA JPL compliant function: Get event point coordinates
	function getEventPoint(e: MouseEvent | TouchEvent): { x: number; y: number } {
		if ('touches' in e && e.touches.length > 0) {
			return { x: e.touches[0].clientX, y: e.touches[0].clientY };
		}
		return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
	}

	// NASA JPL compliant function: Setup keyboard navigation
	function setupKeyboardNavigation(): void {
		if (!container) return;

		// Keyboard navigation is handled by the drag handle
		container.setAttribute('aria-live', 'polite');
	}

	// NASA JPL compliant function: Handle keyboard events
	function handleKeyDown(e: KeyboardEvent): void {
		if (isMinimized) return;

		const step = e.shiftKey ? 1 : gridSize;
		let moved = false;

		switch (e.key) {
			case 'ArrowLeft':
				position.update(p => ({ ...p, x: p.x - step }));
				moved = true;
				break;
			case 'ArrowRight':
				position.update(p => ({ ...p, x: p.x + step }));
				moved = true;
				break;
			case 'ArrowUp':
				position.update(p => ({ ...p, y: p.y - step }));
				moved = true;
				break;
			case 'ArrowDown':
				position.update(p => ({ ...p, y: p.y + step }));
				moved = true;
				break;
			case 'Escape':
				if (minimizable) toggleMinimize();
				break;
		}

		if (moved) {
			e.preventDefault();
			savePosition();
		}
	}

	// Lifecycle
	onMount(() => {
		initializeComponent();
		
		// Global event listeners for mouse/touch
		window.addEventListener('mousemove', handleDragMove);
		window.addEventListener('touchmove', handleDragMove, { passive: false });
		window.addEventListener('mouseup', handleEnd);
		window.addEventListener('touchend', handleEnd);
		
		if (isResizing) {
			window.addEventListener('mousemove', handleResizeMove);
			window.addEventListener('touchmove', handleResizeMove, { passive: false });
		}
	});

	onDestroy(() => {
		window.removeEventListener('mousemove', handleDragMove);
		window.removeEventListener('touchmove', handleDragMove);
		window.removeEventListener('mouseup', handleEnd);
		window.removeEventListener('touchend', handleEnd);
		window.removeEventListener('mousemove', handleResizeMove);
		window.removeEventListener('touchmove', handleResizeMove);
	});

	// Reactive statements
	$: if (isResizing) {
		window.addEventListener('mousemove', handleResizeMove);
		window.addEventListener('touchmove', handleResizeMove, { passive: false });
	} else {
		window.removeEventListener('mousemove', handleResizeMove);
		window.removeEventListener('touchmove', handleResizeMove);
	}

	$: transformStyle = `translate3d(${$position.x}px, ${$position.y}px, 0) scale(${$minimizeScale})`;
</script>

<div
	bind:this={container}
	class="draggable-container"
	class:dragging={isDragging}
	class:resizing={isResizing}
	class:minimized={isMinimized}
	style="
		transform: {transformStyle};
		width: {$size.width}px;
		height: {$size.height}px;
		z-index: {containerZIndex};
	"
	role="dialog"
	aria-label="{title || 'Draggable container'}"
>
	<div
		class="drag-handle"
		role="button"
		aria-label="Drag handle for {title || 'container'}"
		tabindex="0"
		on:mousedown={handleDragStart}
		on:touchstart={handleDragStart}
		on:keydown={handleKeyDown}
		on:focus={handleFocus}
	>
		<span class="title">{title}</span>
		{#if minimizable}
			<button
				class="minimize-button"
				on:click|stopPropagation={toggleMinimize}
				aria-label={isMinimized ? 'Restore' : 'Minimize'}
			>
				{isMinimized ? '□' : '—'}
			</button>
		{/if}
	</div>

	{#if !isMinimized}
		<div class="content">
			<slot />
		</div>

		{#if resizable}
			<div class="resize-handle resize-n" role="button" aria-label="Resize north" tabindex="-1" on:mousedown={handleResizeStart('n')} on:touchstart={handleResizeStart('n')} />
			<div class="resize-handle resize-e" role="button" aria-label="Resize east" tabindex="-1" on:mousedown={handleResizeStart('e')} on:touchstart={handleResizeStart('e')} />
			<div class="resize-handle resize-s" role="button" aria-label="Resize south" tabindex="-1" on:mousedown={handleResizeStart('s')} on:touchstart={handleResizeStart('s')} />
			<div class="resize-handle resize-w" role="button" aria-label="Resize west" tabindex="-1" on:mousedown={handleResizeStart('w')} on:touchstart={handleResizeStart('w')} />
			<div class="resize-handle resize-ne" role="button" aria-label="Resize northeast" tabindex="-1" on:mousedown={handleResizeStart('ne')} on:touchstart={handleResizeStart('ne')} />
			<div class="resize-handle resize-se" role="button" aria-label="Resize southeast" tabindex="-1" on:mousedown={handleResizeStart('se')} on:touchstart={handleResizeStart('se')} />
			<div class="resize-handle resize-sw" role="button" aria-label="Resize southwest" tabindex="-1" on:mousedown={handleResizeStart('sw')} on:touchstart={handleResizeStart('sw')} />
			<div class="resize-handle resize-nw" role="button" aria-label="Resize northwest" tabindex="-1" on:mousedown={handleResizeStart('nw')} on:touchstart={handleResizeStart('nw')} />
		{/if}
	{/if}
</div>

<style>
	.draggable-container {
		position: fixed;
		background: var(--color-surface, #1a1a1a);
		border: 1px solid var(--color-border, #333);
		border-radius: 8px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
		display: flex;
		flex-direction: column;
		will-change: transform;
		transform-origin: top left;
		transition: box-shadow 0.2s ease;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}

	.draggable-container:focus {
		outline: 2px solid var(--color-primary, #007acc);
		outline-offset: -2px;
	}

	.draggable-container.dragging {
		cursor: move;
		box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
	}

	.draggable-container.resizing {
		cursor: nwse-resize;
	}

	.draggable-container.minimized {
		overflow: hidden;
		cursor: pointer;
	}

	.drag-handle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		background: var(--color-surface-variant, #2a2a2a);
		border-bottom: 1px solid var(--color-border, #333);
		border-radius: 8px 8px 0 0;
		cursor: move;
		touch-action: none;
	}

	.title {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text, #fff);
		pointer-events: none;
	}

	.minimize-button {
		padding: 4px 8px;
		background: transparent;
		border: 1px solid var(--color-border, #333);
		border-radius: 4px;
		color: var(--color-text, #fff);
		font-size: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.minimize-button:hover {
		background: var(--color-surface, #1a1a1a);
		border-color: var(--color-primary, #007acc);
	}

	.content {
		flex: 1;
		padding: 16px;
		overflow: auto;
		min-height: 0;
	}

	.resize-handle {
		position: absolute;
		background: transparent;
		touch-action: none;
	}

	.resize-n,
	.resize-s {
		left: 8px;
		right: 8px;
		height: 8px;
		cursor: ns-resize;
	}

	.resize-n {
		top: -4px;
	}

	.resize-s {
		bottom: -4px;
	}

	.resize-e,
	.resize-w {
		top: 8px;
		bottom: 8px;
		width: 8px;
		cursor: ew-resize;
	}

	.resize-e {
		right: -4px;
	}

	.resize-w {
		left: -4px;
	}

	.resize-ne,
	.resize-se,
	.resize-sw,
	.resize-nw {
		width: 16px;
		height: 16px;
	}

	.resize-ne {
		top: -4px;
		right: -4px;
		cursor: nesw-resize;
	}

	.resize-se {
		bottom: -4px;
		right: -4px;
		cursor: nwse-resize;
	}

	.resize-sw {
		bottom: -4px;
		left: -4px;
		cursor: nesw-resize;
	}

	.resize-nw {
		top: -4px;
		left: -4px;
		cursor: nwse-resize;
	}

	/* Performance optimizations */
	@media (prefers-reduced-motion: reduce) {
		.draggable-container {
			transition: none;
		}
	}

	/* High refresh rate displays */
	@media (min-resolution: 2dppx) {
		.draggable-container {
			image-rendering: -webkit-optimize-contrast;
			-webkit-font-smoothing: antialiased;
		}
	}
</style>