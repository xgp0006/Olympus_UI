<!-- MotorControls Component - NASA JPL Compliant -->
<script lang="ts">
	import type { Motor } from '../types/motor-types';
	import { emergencyStop, getEmergencyMetrics } from '../services/emergency-stop';
	
	// Props
	export let motors: Motor[] = [];
	export const selectedMotors: Set<number> = new Set(); // External reference for motor selection state
	export let canTest: boolean = false;
	export let testActive: boolean = false;
	export let maxThrottle: number = 0;
	export let onSetMotorThrottle: (motorId: number, throttle: number) => Promise<void>;
	export let onSetAllMotorsThrottle: (throttle: number) => Promise<void>;
	export let onRunDirectionTest: () => Promise<void>;
	export let onRunRampTest: () => Promise<void>;
</script>

<!-- Motor Controls -->
<div class="motor-controls">
	<h3>Motor Control</h3>
	
	<div class="control-buttons">
		<button 
			class="test-button"
			on:click={onRunDirectionTest}
			disabled={!canTest || testActive}
		>
			Direction Test
		</button>
		<button 
			class="test-button"
			on:click={onRunRampTest}
			disabled={!canTest || testActive}
		>
			Ramp Test
		</button>
		<button
			class="test-button stop"
			on:click={() => onSetAllMotorsThrottle(0)}
			disabled={!canTest}
		>
			Stop All
		</button>
		<button
			class="test-button emergency"
			on:click={emergencyStop}
			title="Emergency Stop (ESC key)"
		>
			⚠ E-STOP
		</button>
	</div>
	
	<!-- Individual Motor Sliders -->
	<div class="motor-sliders">
		{#each motors as motor}
			<div class="motor-slider-row">
				<span class="motor-label">M{motor.id}</span>
				<input
					type="range"
					min="0"
					max={maxThrottle}
					value={motor.throttle}
					on:input={(e) => onSetMotorThrottle(motor.id, Number(e.currentTarget.value))}
					disabled={!canTest || testActive}
					class="throttle-slider"
				/>
				<span class="throttle-value">{motor.throttle}%</span>
			</div>
		{/each}
		
		<!-- All Motors Control -->
		<div class="motor-slider-row all-motors">
			<span class="motor-label">ALL</span>
			<input
				type="range"
				min="0"
				max={maxThrottle}
				value="0"
				on:input={(e) => onSetAllMotorsThrottle(Number(e.currentTarget.value))}
				disabled={!canTest || testActive}
				class="throttle-slider"
			/>
			<span class="throttle-value">-</span>
		</div>
	</div>
</div>

<style>
	/* Motor Controls */
	.motor-controls {
		margin-top: 1rem;
	}
	
	.motor-controls h3 {
		margin-bottom: 0.5rem;
		color: var(--color-text_secondary);
	}
	
	.control-buttons {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	
	.test-button {
		flex: 1;
		padding: 0.75rem;
		background: var(--color-background_tertiary);
		border: 1px solid var(--color-border_primary);
		border-radius: 6px;
		color: var(--color-text_primary);
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.test-button:hover:not(:disabled) {
		background: var(--color-background_quaternary);
		border-color: var(--color-accent_blue);
	}
	
	.test-button.stop {
		background: var(--color-status_error_bg);
		border-color: var(--color-status_error);
		color: var(--color-status_error);
	}
	
	.test-button.stop:hover:not(:disabled) {
		background: var(--color-status_error_bg);
		opacity: 0.8;
	}
	
	.test-button.emergency {
		background: var(--color-status_error);
		border-color: var(--color-text_inverse);
		color: var(--color-text_inverse);
		font-weight: 700;
		box-shadow: 0 2px 8px var(--layout-shadow_dark);
	}
	
	.test-button.emergency:hover {
		transform: scale(1.05);
		box-shadow: 0 4px 12px var(--layout-shadow_dark);
	}
	
	.test-button.emergency:active {
		transform: scale(0.98);
	}
	
	.test-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	/* Motor Sliders */
	.motor-sliders {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.motor-slider-row {
		display: grid;
		grid-template-columns: 50px 1fr 60px;
		align-items: center;
		gap: 0.5rem;
	}
	
	.motor-slider-row.all-motors {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-border_primary);
	}
	
	.motor-label {
		font-weight: 600;
		text-align: center;
	}
	
	.throttle-slider {
		-webkit-appearance: none;
		appearance: none;
		height: 8px;
		background: var(--color-background_tertiary);
		border-radius: 4px;
		outline: none;
		cursor: pointer;
	}
	
	.throttle-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		background: var(--color-accent_blue);
		border-radius: 50%;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.throttle-slider::-moz-range-thumb {
		width: 20px;
		height: 20px;
		background: var(--color-accent_blue);
		border-radius: 50%;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.throttle-slider:hover::-webkit-slider-thumb {
		transform: scale(1.2);
	}
	
	.throttle-slider:hover::-moz-range-thumb {
		transform: scale(1.2);
	}
	
	.throttle-slider:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.throttle-value {
		text-align: right;
		font-weight: 600;
		color: var(--color-accent_green);
	}
	
	/* Touch-specific styles */
	@media (hover: none) {
		.test-button {
			padding: 1rem;
		}
		
		.throttle-slider::-webkit-slider-thumb {
			width: 24px;
			height: 24px;
		}
		
		.throttle-slider::-moz-range-thumb {
			width: 24px;
			height: 24px;
		}
	}
</style>