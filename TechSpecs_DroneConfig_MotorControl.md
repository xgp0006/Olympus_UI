# Technical Specifications: Drone Configuration Motor Control Components

## Component Implementation Details

### 1. MotorTestPanel.svelte - Technical Implementation

**Core Architecture**:
```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { writable, derived } from 'svelte/store';
  import type { MotorTestPanelProps, MotorTelemetry } from '../types/motor-control';

  // Progressive safety system state machine
  let safetyState = writable<'locked' | 'stage1' | 'stage2' | 'stage3' | 'unlocked'>('locked');
  let motorThrottles = writable<number[]>(Array(props.motorCount).fill(0));
  let emergencyStop = writable<boolean>(false);
  
  // WebGPU-accelerated real-time telemetry visualization
  let telemetryCanvas: HTMLCanvasElement;
  let gpuDevice: GPUDevice;
  
  // Safety timeout system
  let safetyTimer: NodeJS.Timeout;
  const SAFETY_TIMEOUT = 30000; // 30 seconds
</script>

<div class="motor-test-panel" class:safety-locked={$safetyState === 'locked'}>
  <!-- Multi-stage safety confirmation -->
  <SafetyConfirmationStages 
    bind:currentStage={$safetyState}
    on:emergency-stop={handleEmergencyStop}
  />
  
  <!-- Motor layout visualization with real-time status -->
  <MotorLayoutDisplay 
    {frameType} 
    {motorCount} 
    telemetry={$telemetryData}
    throttles={$motorThrottles}
  />
  
  <!-- Individual motor control sliders -->
  <div class="motor-controls">
    {#each Array(motorCount) as _, i}
      <MotorSlider 
        motorId={i}
        bind:throttle={$motorThrottles[i]}
        disabled={$safetyState === 'locked'}
        maxThrottle={getMaxThrottleForSafetyLevel($safetyState)}
        on:throttle-change={handleMotorThrottleChange}
      />
    {/each}
  </div>
  
  <!-- Emergency stop - always visible and accessible -->
  <EmergencyStopButton on:click={handleEmergencyStop} />
</div>
```

**Safety State Machine**:
```typescript
const safetyStateMachine = {
  locked: {
    maxThrottle: 0,
    requirements: ['propellers_removed', 'battery_connected'],
    timeout: null,
    canProgress: (requirements) => requirements.every(r => completed[r])
  },
  stage1: {
    maxThrottle: 0.25,
    requirements: ['motor_test_confirmation'],
    timeout: 30000,
    canProgress: (requirements) => requirements.every(r => completed[r])
  },
  stage2: {
    maxThrottle: 0.5,
    requirements: ['progressive_unlock_1'],
    timeout: 45000,
    canProgress: (requirements) => requirements.every(r => completed[r])
  },
  stage3: {
    maxThrottle: 0.75,
    requirements: ['progressive_unlock_2'],
    timeout: 60000,
    canProgress: (requirements) => requirements.every(r => completed[r])
  },
  unlocked: {
    maxThrottle: 1.0,
    requirements: ['full_power_confirmation'],
    timeout: 120000,
    canProgress: () => true
  }
};
```

**WebGPU Telemetry Rendering**:
```typescript
class TelemetryRenderer {
  private device: GPUDevice;
  private pipeline: GPURenderPipeline;
  private buffers: Map<string, GPUBuffer> = new Map();

  async init(canvas: HTMLCanvasElement) {
    const adapter = await navigator.gpu?.requestAdapter();
    this.device = await adapter?.requestDevice();
    
    // Create compute shader for real-time telemetry processing
    const computeShader = this.device.createShaderModule({
      code: `
        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          let index = global_id.x;
          // Process telemetry data in parallel
          telemetryBuffer[index] = processMotorData(rawTelemetry[index]);
        }
      `
    });
  }

  updateTelemetry(data: MotorTelemetry[]) {
    // GPU-accelerated telemetry processing
    const encoder = this.device.createCommandEncoder();
    const computePass = encoder.beginComputePass();
    computePass.setBindGroup(0, this.bindGroup);
    computePass.dispatchWorkgroups(Math.ceil(data.length / 64));
    computePass.end();
    this.device.queue.submit([encoder.finish()]);
  }
}
```

### 2. ESCConfigurator.svelte - Technical Implementation

**Protocol Detection System**:
```typescript
class ESCProtocolManager {
  private supportedProtocols: ESCProtocol[] = [
    {
      name: 'DShot1200',
      type: 'DSHOT1200',
      requiresCalibration: false,
      supportsTelemetry: true,
      maxUpdateRate: 8000,
      description: 'Highest performance digital protocol',
      minVersion: '4.0.0'
    },
    // ... other protocols
  ];

  async detectESCCapabilities(): Promise<ESCCapabilities[]> {
    // Send detection commands to each ESC
    const capabilities = await Promise.all(
      this.connectedESCs.map(async (esc) => {
        const firmware = await this.queryESCFirmware(esc.id);
        const protocols = await this.queryProtocolSupport(esc.id);
        return {
          escId: esc.id,
          firmware: firmware.name,
          version: firmware.version,
          supportedProtocols: protocols,
          telemetryCapable: protocols.includes('DSHOT'),
          bidirectionalDshot: firmware.version >= '32.7.0'
        };
      })
    );
    return capabilities;
  }

  async configureProtocol(protocol: ESCProtocol): Promise<boolean> {
    try {
      // Validate protocol compatibility
      await this.validateProtocolCompatibility(protocol);
      
      // Configure each ESC
      for (const esc of this.connectedESCs) {
        await this.sendProtocolConfiguration(esc.id, protocol);
      }
      
      // Verify configuration
      return await this.verifyProtocolConfiguration(protocol);
    } catch (error) {
      console.error('Protocol configuration failed:', error);
      return false;
    }
  }
}
```

### 3. MotorLayoutVisualizer.svelte - Interactive Canvas Implementation

**Drag-and-Drop Motor Positioning**:
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let isDragging = false;
  let dragMotorId = -1;
  let dragOffset = { x: 0, y: 0 };

  onMount(() => {
    ctx = canvas.getContext('2d');
    setupCanvasInteraction();
    renderMotorLayout();
  });

  function setupCanvasInteraction() {
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
  }

  function renderMotorLayout() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw frame outline
    drawFrameOutline(frameType);
    
    // Draw motor positions with real-time status
    motorPositions.forEach((motor, index) => {
      const screenPos = normalizedToScreen(motor.x, motor.y);
      const telemetry = telemetryData?.find(t => t.motorId === motor.motorId);
      
      drawMotor(screenPos, motor, telemetry);
      drawRotationIndicator(screenPos, motor.rotation);
      drawMotorLabel(screenPos, motor.motorId);
    });
    
    // Draw connection lines
    drawMotorConnections();
  }

  function drawMotor(pos: Point, motor: MotorPosition, telemetry?: MotorTelemetry) {
    const radius = 20;
    const healthColor = getHealthColor(telemetry);
    
    // Motor body
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = motor.active ? healthColor : '#666';
    ctx.fill();
    ctx.strokeStyle = motor.motorId === selectedMotor ? '#00ff00' : '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // RPM indicator
    if (telemetry?.rpm > 0) {
      const rpmRadius = radius + 5 + (telemetry.rpm / 10000) * 10;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, rpmRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
</script>

<canvas 
  bind:this={canvas}
  width="600" 
  height="400"
  class="motor-layout-canvas"
  on:contextmenu|preventDefault
/>
```

### 4. SafetyInterlocks.svelte - Multi-Level Confirmation System

**Gesture-Based Confirmation for Mobile**:
```typescript
class GestureConfirmation {
  private touchSequence: TouchPoint[] = [];
  private requiredPattern: GesturePattern;

  constructor(private element: HTMLElement) {
    this.setupGestureRecognition();
  }

  setupGestureRecognition() {
    let touchStartTime = 0;
    let touchCount = 0;

    this.element.addEventListener('touchstart', (e) => {
      touchStartTime = Date.now();
      touchCount = e.touches.length;
      
      // Prevent accidental activation with palm rejection
      if (touchCount > 2) {
        e.preventDefault();
        return;
      }
    });

    this.element.addEventListener('touchend', (e) => {
      const touchDuration = Date.now() - touchStartTime;
      
      // Require deliberate long press for safety confirmation
      if (touchDuration >= 2000 && touchCount === 1) {
        this.confirmGesture();
      }
    });
  }

  private confirmGesture() {
    // Haptic feedback for confirmation
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
    
    this.dispatchEvent('gesture-confirmed');
  }
}
```

**Time-Based Safety Countdown**:
```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { tweened } from 'svelte/motion';
  
  let countdownTimer: number;
  let countdown = tweened(0, { duration: 1000 });
  
  function startSafetyCountdown(duration: number) {
    countdown.set(duration);
    
    const interval = setInterval(() => {
      countdown.update(n => {
        if (n <= 1) {
          clearInterval(interval);
          onCountdownComplete();
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    
    return interval;
  }
</script>

<div class="safety-countdown" class:active={$countdown > 0}>
  <div class="countdown-circle">
    <svg viewBox="0 0 100 100">
      <circle 
        cx="50" cy="50" r="45"
        fill="none" 
        stroke="#ff4444" 
        stroke-width="4"
        stroke-dasharray="283"
        stroke-dashoffset={283 * (1 - $countdown / totalTime)}
        transform="rotate(-90 50 50)"
      />
    </svg>
    <span class="countdown-text">{Math.ceil($countdown)}</span>
  </div>
</div>
```

### 5. MotorHealthMonitor.svelte - Real-Time Telemetry System

**Streaming Telemetry with WebSocket**:
```typescript
class TelemetryStreamer {
  private ws: WebSocket;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  constructor(private url: string) {
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('Telemetry stream connected');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event) => {
      const telemetry: MotorTelemetry[] = JSON.parse(event.data);
      this.processTelemetryData(telemetry);
    };
    
    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, 1000 * Math.pow(2, this.reconnectAttempts));
      }
    };
  }

  private processTelemetryData(data: MotorTelemetry[]) {
    // Real-time health analysis
    data.forEach(motor => {
      this.analyzeMotorHealth(motor);
    });
    
    // Update stores
    telemetryStore.set(data);
    
    // Check for alerts
    this.checkHealthAlerts(data);
  }

  private analyzeMotorHealth(motor: MotorTelemetry): HealthStatus {
    const alerts: HealthAlert[] = [];
    
    // Temperature monitoring
    if (motor.temperature > 85) {
      alerts.push({
        motorId: motor.motorId,
        severity: 'critical',
        type: 'temperature',
        message: `Motor ${motor.motorId} overheating: ${motor.temperature}°C`,
        timestamp: Date.now(),
        autoResolve: false
      });
    }
    
    // Current monitoring
    if (motor.current > 30) {
      alerts.push({
        motorId: motor.motorId,
        severity: 'warning',
        type: 'current',
        message: `High current draw: ${motor.current}A`,
        timestamp: Date.now(),
        autoResolve: true
      });
    }
    
    // RPM anomaly detection
    const expectedRpm = this.calculateExpectedRpm(motor.motorId);
    const rpmDeviation = Math.abs(motor.rpm - expectedRpm) / expectedRpm;
    
    if (rpmDeviation > 0.15) {
      alerts.push({
        motorId: motor.motorId,
        severity: 'warning',
        type: 'rpm',
        message: `RPM deviation detected: ${motor.rpm} RPM (expected: ${expectedRpm})`,
        timestamp: Date.now(),
        autoResolve: true
      });
    }
    
    return {
      motorId: motor.motorId,
      overall: alerts.some(a => a.severity === 'critical') ? 'critical' : 
               alerts.some(a => a.severity === 'warning') ? 'warning' : 'good',
      alerts
    };
  }
}
```

### 6. DirectionTester.svelte - Audio Analysis Implementation

**Sound-Based Direction Detection**:
```typescript
class AudioDirectionAnalyzer {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private microphone: MediaStreamAudioSourceNode;
  
  async init(): Promise<void> {
    this.audioContext = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.microphone = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    
    this.analyser.fftSize = 8192;
    this.microphone.connect(this.analyser);
  }

  analyzeMotorDirection(motorId: number, duration: number): Promise<DirectionTestResult> {
    return new Promise((resolve) => {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      const samples: AudioSample[] = [];
      const startTime = Date.now();
      
      const analyzeFrame = () => {
        this.analyser.getByteFrequencyData(dataArray);
        
        // Extract dominant frequency and amplitude
        const dominantFreq = this.findDominantFrequency(dataArray);
        const amplitude = this.calculateRMS(dataArray);
        
        samples.push({
          timestamp: Date.now() - startTime,
          frequency: dominantFreq,
          amplitude: amplitude
        });
        
        if (Date.now() - startTime < duration) {
          requestAnimationFrame(analyzeFrame);
        } else {
          const result = this.determineRotationDirection(samples);
          resolve({
            motorId,
            detectedDirection: result.direction,
            expectedDirection: this.getExpectedDirection(motorId),
            confidence: result.confidence,
            needsCorrection: result.direction !== this.getExpectedDirection(motorId),
            audioSignature: result
          });
        }
      };
      
      analyzeFrame();
    });
  }

  private determineRotationDirection(samples: AudioSample[]): AudioAnalysis {
    // Analyze frequency modulation patterns
    const frequencyDeltas = samples.map((sample, i) => 
      i > 0 ? sample.frequency - samples[i-1].frequency : 0
    );
    
    // CW rotation typically shows increasing frequency pattern
    // CCW rotation shows decreasing frequency pattern
    const avgDelta = frequencyDeltas.reduce((a, b) => a + b, 0) / frequencyDeltas.length;
    
    return {
      frequency: samples.reduce((acc, s) => acc + s.frequency, 0) / samples.length,
      amplitude: samples.reduce((acc, s) => acc + s.amplitude, 0) / samples.length,
      rotationDirection: avgDelta > 0 ? 'cw' : 'ccw',
      confidence: Math.min(Math.abs(avgDelta) * 10, 1.0)
    };
  }
}
```

### 7. OutputGraphs.svelte - WebGPU Accelerated Visualization

**High-Performance Real-Time Graphing**:
```typescript
class GPUGraphRenderer {
  private device: GPUDevice;
  private canvas: HTMLCanvasElement;
  private context: GPUCanvasContext;
  private pipeline: GPURenderPipeline;
  
  async init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.context = canvas.getContext('webgpu');
    
    const adapter = await navigator.gpu.requestAdapter();
    this.device = await adapter.requestDevice();
    
    // Configure canvas
    this.context.configure({
      device: this.device,
      format: 'bgra8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    
    // Create render pipeline for high-frequency updates
    this.pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({
          code: `
            @vertex
            fn main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4<f32> {
              let pos = array<vec2<f32>, 6>(
                vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
                vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0)
              );
              return vec4<f32>(pos[vertexIndex], 0.0, 1.0);
            }
          `
        }),
        entryPoint: 'main'
      },
      fragment: {
        module: this.device.createShaderModule({
          code: `
            @fragment
            fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
              // Render telemetry data points
              return renderTelemetryPoint(fragCoord.xy);
            }
          `
        }),
        entryPoint: 'main',
        targets: [{ format: 'bgra8unorm' }]
      }
    });
  }

  renderFrame(telemetryData: MotorTelemetry[], timeWindow: number) {
    const encoder = this.device.createCommandEncoder();
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });

    renderPass.setPipeline(this.pipeline);
    renderPass.draw(6); // Full-screen quad
    renderPass.end();

    this.device.queue.submit([encoder.finish()]);
  }
}
```

## Performance Optimizations

### Memory Management
- Circular buffers for telemetry data to prevent memory leaks
- Lazy loading of historical data with virtualization
- WebWorker-based calculations to prevent UI blocking

### Real-Time Rendering
- WebGPU compute shaders for parallel telemetry processing
- Frame rate limiting to prevent excessive GPU usage
- Adaptive quality scaling based on system performance

### Safety System Performance
- Hardware-accelerated timeout timers using Web APIs
- Immediate emergency stop response (<1ms latency)
- Redundant safety checks with multiple validation paths

## Testing Strategy

### Unit Tests
```typescript
// Example safety interlock test
describe('SafetyInterlocks', () => {
  test('should prevent motor activation without proper confirmations', async () => {
    const { getByRole, queryByRole } = render(SafetyInterlocks, {
      props: { currentLevel: 1, requiresGesture: false }
    });
    
    const motorSlider = queryByRole('slider');
    expect(motorSlider).toBeDisabled();
    
    // Should not enable until safety requirements met
    const propCheckbox = getByRole('checkbox', { name: /propellers removed/i });
    await fireEvent.click(propCheckbox);
    
    expect(motorSlider).toBeDisabled(); // Still disabled until all requirements met
  });
});
```

### Integration Tests
- End-to-end calibration workflow testing
- Safety system failure scenarios
- Real-time telemetry accuracy validation
- Cross-component communication testing

### Performance Tests
- Telemetry rendering at 60+ FPS with 8 motors
- Safety response time under 1ms
- Memory usage stability over extended periods
- WebGPU fallback to Canvas 2D compatibility

This technical specification provides the detailed implementation roadmap for creating aerospace-grade motor control components that prioritize safety while delivering high-performance real-time capabilities.