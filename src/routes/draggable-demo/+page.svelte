<script lang="ts">
	import { DraggableContainer } from '$lib/components/ui';
	import { getPerformanceMonitor, type PerformanceMetrics } from '$lib/utils/performance-monitor';
	import { onMount, onDestroy } from 'svelte';

	let performanceMetrics: PerformanceMetrics | null = null;
	const monitor = getPerformanceMonitor();

	onMount(() => {
		// Start performance monitoring
		monitor.start((metrics) => {
			performanceMetrics = metrics;
		});
	});

	onDestroy(() => {
		monitor.stop();
	});

	// Example data for multiple containers
	const containers = [
		{
			id: 'telemetry',
			title: 'Telemetry Dashboard',
			x: 50,
			y: 50,
			width: 450,
			height: 350
		},
		{
			id: 'controls',
			title: 'Mission Control Panel',
			x: 550,
			y: 50,
			width: 400,
			height: 300
		},
		{
			id: 'logs',
			title: 'System Logs',
			x: 100,
			y: 400,
			width: 500,
			height: 250
		}
	];
</script>

<svelte:head>
	<title>DraggableContainer Demo - Modular C2 Frontend</title>
</svelte:head>

<main class="demo-page">
	<div class="header">
		<h1>DraggableContainer Component Demo</h1>
		<p>High-performance draggable containers with NASA JPL compliance</p>
	</div>

	{#if performanceMetrics}
		<div class="performance-overlay">
			<div class="metric">
				<span class="label">FPS:</span>
				<span class="value" class:optimal={performanceMetrics.fps >= 137}>
					{performanceMetrics.fps}
				</span>
			</div>
			<div class="metric">
				<span class="label">Frame Time:</span>
				<span class="value">{performanceMetrics.frameTime}ms</span>
			</div>
			<div class="metric">
				<span class="label">Avg FPS:</span>
				<span class="value">{performanceMetrics.averageFps}</span>
			</div>
		</div>
	{/if}

	<!-- Telemetry Dashboard -->
	<DraggableContainer
		id={containers[0].id}
		title={containers[0].title}
		initialX={containers[0].x}
		initialY={containers[0].y}
		initialWidth={containers[0].width}
		initialHeight={containers[0].height}
	>
		<div class="container-content telemetry">
			<h3>Real-time Telemetry</h3>
			<div class="telemetry-grid">
				<div class="telemetry-item">
					<span class="label">Altitude</span>
					<span class="value">12,450 m</span>
				</div>
				<div class="telemetry-item">
					<span class="label">Velocity</span>
					<span class="value">342.5 m/s</span>
				</div>
				<div class="telemetry-item">
					<span class="label">Heading</span>
					<span class="value">045°</span>
				</div>
				<div class="telemetry-item">
					<span class="label">Battery</span>
					<span class="value">87%</span>
				</div>
			</div>
			<div class="status-bar">
				<span class="status-indicator operational">● OPERATIONAL</span>
				<span class="timestamp">Last Update: {new Date().toLocaleTimeString()}</span>
			</div>
		</div>
	</DraggableContainer>

	<!-- Mission Control Panel -->
	<DraggableContainer
		id={containers[1].id}
		title={containers[1].title}
		initialX={containers[1].x}
		initialY={containers[1].y}
		initialWidth={containers[1].width}
		initialHeight={containers[1].height}
	>
		<div class="container-content controls">
			<h3>Flight Controls</h3>
			<div class="control-grid">
				<button class="control-btn primary">Launch Sequence</button>
				<button class="control-btn">Abort Mission</button>
				<button class="control-btn">Manual Override</button>
				<button class="control-btn">Emergency Stop</button>
			</div>
			<div class="control-section">
				<label>
					<span>Thrust Control</span>
					<input type="range" min="0" max="100" value="75" />
				</label>
				<label>
					<span>Pitch Adjustment</span>
					<input type="range" min="-90" max="90" value="0" />
				</label>
			</div>
		</div>
	</DraggableContainer>

	<!-- System Logs -->
	<DraggableContainer
		id={containers[2].id}
		title={containers[2].title}
		initialX={containers[2].x}
		initialY={containers[2].y}
		initialWidth={containers[2].width}
		initialHeight={containers[2].height}
	>
		<div class="container-content logs">
			<h3>System Activity Log</h3>
			<div class="log-entries">
				<div class="log-entry info">
					<span class="time">14:23:45</span>
					<span class="message">System initialized successfully</span>
				</div>
				<div class="log-entry success">
					<span class="time">14:23:47</span>
					<span class="message">All subsystems operational</span>
				</div>
				<div class="log-entry warning">
					<span class="time">14:23:52</span>
					<span class="message">High CPU usage detected (87%)</span>
				</div>
				<div class="log-entry info">
					<span class="time">14:24:01</span>
					<span class="message">Telemetry stream established</span>
				</div>
			</div>
		</div>
	</DraggableContainer>

	<div class="instructions">
		<h2>Instructions</h2>
		<ul>
			<li>Drag containers by their title bars</li>
			<li>Resize from corners and edges</li>
			<li>Minimize/restore with the — button</li>
			<li>Use arrow keys for keyboard navigation</li>
			<li>Shift + arrows for 1px precise movement</li>
			<li>Positions are saved in localStorage</li>
			<li>8px grid snapping enabled by default</li>
			<li>Auto-snaps to window edges</li>
		</ul>
	</div>
</main>

<style>
	.demo-page {
		width: 100vw;
		height: 100vh;
		background: var(--color-background, #0a0a0a);
		color: var(--color-text, #fff);
		position: relative;
		overflow: hidden;
	}

	.header {
		position: fixed;
		top: 20px;
		left: 20px;
		z-index: 100;
		pointer-events: none;
	}

	.header h1 {
		font-size: 28px;
		margin: 0 0 8px 0;
		font-weight: 700;
	}

	.header p {
		font-size: 16px;
		opacity: 0.8;
		margin: 0;
	}

	.performance-overlay {
		position: fixed;
		top: 20px;
		right: 20px;
		background: rgba(0, 0, 0, 0.8);
		border: 1px solid var(--color-border, #333);
		border-radius: 8px;
		padding: 16px;
		display: flex;
		gap: 16px;
		z-index: 100;
		font-family: 'SF Mono', monospace;
		font-size: 13px;
	}

	.performance-overlay .metric {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.performance-overlay .label {
		opacity: 0.7;
		font-size: 11px;
		text-transform: uppercase;
	}

	.performance-overlay .value {
		font-weight: 600;
		font-size: 18px;
	}

	.performance-overlay .value.optimal {
		color: #4ade80;
	}

	.instructions {
		position: fixed;
		bottom: 20px;
		left: 20px;
		background: rgba(0, 0, 0, 0.8);
		border: 1px solid var(--color-border, #333);
		border-radius: 8px;
		padding: 20px;
		max-width: 400px;
		z-index: 100;
	}

	.instructions h2 {
		font-size: 18px;
		margin: 0 0 12px 0;
	}

	.instructions ul {
		margin: 0;
		padding-left: 20px;
		font-size: 14px;
		line-height: 1.6;
		opacity: 0.9;
	}

	/* Container Content Styles */
	.container-content {
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 16px;
		font-size: 14px;
	}

	.container-content h3 {
		font-size: 16px;
		margin: 0;
		font-weight: 600;
	}

	/* Telemetry Styles */
	.telemetry-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		flex: 1;
	}

	.telemetry-item {
		background: rgba(0, 0, 0, 0.3);
		border-radius: 6px;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.telemetry-item .label {
		font-size: 12px;
		opacity: 0.7;
		text-transform: uppercase;
	}

	.telemetry-item .value {
		font-size: 20px;
		font-weight: 600;
		font-family: 'SF Mono', monospace;
	}

	.status-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 12px;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 6px;
		font-size: 12px;
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: 6px;
		font-weight: 600;
	}

	.status-indicator.operational {
		color: #4ade80;
	}

	.timestamp {
		opacity: 0.7;
		font-family: 'SF Mono', monospace;
	}

	/* Control Panel Styles */
	.control-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-bottom: 16px;
	}

	.control-btn {
		padding: 12px 16px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid var(--color-border, #333);
		border-radius: 6px;
		color: var(--color-text, #fff);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.control-btn:hover {
		background: rgba(255, 255, 255, 0.15);
		border-color: var(--color-primary, #007acc);
	}

	.control-btn.primary {
		background: var(--color-primary, #007acc);
		border-color: var(--color-primary, #007acc);
	}

	.control-btn.primary:hover {
		background: var(--color-primary-hover, #0066bb);
	}

	.control-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.control-section label {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.control-section span {
		font-size: 12px;
		opacity: 0.8;
		text-transform: uppercase;
	}

	.control-section input[type="range"] {
		width: 100%;
		height: 6px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		outline: none;
		-webkit-appearance: none;
		appearance: none;
	}

	.control-section input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		background: var(--color-primary, #007acc);
		border-radius: 50%;
		cursor: pointer;
	}

	/* Log Styles */
	.log-entries {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-family: 'SF Mono', monospace;
		font-size: 13px;
		flex: 1;
		overflow-y: auto;
		max-height: 180px;
	}

	.log-entry {
		display: flex;
		gap: 12px;
		padding: 8px 12px;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 4px;
		border-left: 3px solid;
	}

	.log-entry.info {
		border-left-color: #3b82f6;
	}

	.log-entry.success {
		border-left-color: #4ade80;
	}

	.log-entry.warning {
		border-left-color: #fbbf24;
	}

	.log-entry .time {
		opacity: 0.7;
		flex-shrink: 0;
	}

	.log-entry .message {
		flex: 1;
	}
</style>