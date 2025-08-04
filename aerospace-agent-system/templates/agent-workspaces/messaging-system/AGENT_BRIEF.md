# Agent Brief: Messaging System Engineer

## Mission

Build a high-performance toast notification system for NOTAMS, ADS-B warnings, weather alerts, and system messages with Tauri backend integration.

## Performance Target

- **Frame Budget**: 0.3ms per frame
- **Message Processing**: <1ms per message
- **Animation**: 60fps minimum for transitions

## Technical Requirements

### Core Component Structure

```svelte
<!-- src/lib/map-features/messaging/MessageSystem.svelte -->
<script lang="ts">
  import type { Message, MessageCategory, MessagePriority } from '$lib/map-features/types';
  import { fly, fade } from 'svelte/transition';
  import { MessageQueue } from './MessageQueue';
  import { TauriMessageBridge } from './TauriMessageBridge';

  const queue = new MessageQueue();
  const bridge = new TauriMessageBridge();

  export let maxVisibleToasts = 5;
  export let position: 'bottom-right' | 'top-right' = 'bottom-right';
</script>
```

### Message Queue Architecture

```typescript
class MessageQueue {
  private readonly messages = new Map<string, Message>();
  private readonly priorityQueue: PriorityQueue<Message>;
  private readonly maxMessages = 1000; // Bounded allocation

  add(message: Message): void {
    // Dedupe by ID
    if (this.messages.has(message.id)) return;

    // Enforce max limit
    if (this.messages.size >= this.maxMessages) {
      this.evictOldest();
    }

    this.messages.set(message.id, message);
    this.priorityQueue.insert(message, this.getPriority(message));
  }

  private getPriority(message: Message): number {
    const priorityWeights = {
      critical: 1000,
      high: 100,
      medium: 10,
      low: 1
    };

    const categoryWeights = {
      'adsb-warning': 500,
      'weather-warning': 400,
      'faa-alert': 300,
      notam: 200,
      system: 100
    };

    return priorityWeights[message.priority] + categoryWeights[message.category];
  }
}
```

### Tauri Integration

```typescript
import { invoke, listen } from '@tauri-apps/api';

class TauriMessageBridge {
  private listeners: Map<string, UnlistenFn> = new Map();

  async initialize(): Promise<void> {
    // Listen for different message types
    const categories: MessageCategory[] = ['notam', 'adsb-warning', 'faa-alert', 'weather-warning'];

    for (const category of categories) {
      const unlisten = await listen<MessagePayload>(`message:${category}`, (event) =>
        this.handleMessage(category, event.payload)
      );

      this.listeners.set(category, unlisten);
    }
  }

  private handleMessage(category: MessageCategory, payload: any): void {
    const message: Message = {
      id: crypto.randomUUID(),
      category,
      priority: this.determinePriority(payload),
      timestamp: new Date(),
      title: payload.title,
      content: payload.content,
      metadata: payload.metadata,
      actions: this.createActions(payload)
    };

    messageStore.add(message);
  }
}
```

### Toast Stack Management

```typescript
class ToastStackManager {
  private visibleToasts: Message[] = [];
  private readonly stackSpacing = 10; // pixels
  private readonly toastHeight = 80; // pixels

  calculatePosition(index: number): { x: number; y: number } {
    // Calculate stacked position with easing
    const baseY = window.innerHeight - 20;
    const y = baseY - index * (this.toastHeight + this.stackSpacing);

    return { x: window.innerWidth - 320, y };
  }

  handleAccumulation(): void {
    // Accordion behavior for overflow
    if (this.visibleToasts.length > this.maxVisible) {
      this.createAccordion();
    }
  }
}
```

### Message Categories

#### NOTAMS

```typescript
interface NOTAMMessage extends Message {
  category: 'notam';
  metadata: {
    notamId: string;
    effectiveFrom: Date;
    effectiveTo: Date;
    location: LatLng;
    radius: number;
    flightLevels?: [number, number];
  };
}
```

#### ADS-B Warnings

```typescript
interface ADSBWarningMessage extends Message {
  category: 'adsb-warning';
  metadata: {
    aircraft: ADSBTarget;
    warningType: 'proximity' | 'collision' | 'airspace';
    distance: number;
    timeToClosest: number;
  };
}
```

#### Weather Warnings

```typescript
interface WeatherWarningMessage extends Message {
  category: 'weather-warning';
  metadata: {
    warningType: 'thunderstorm' | 'icing' | 'turbulence' | 'windshear';
    severity: 'moderate' | 'severe' | 'extreme';
    affectedArea: GeoJSON.Polygon;
    validTime: DateRange;
  };
}
```

### Visual Design

```svelte
<style>
  .toast {
    /* GPU-accelerated transforms */
    will-change: transform;
    transform: translateZ(0);

    /* Smooth shadows without repaints */
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

    /* Category-based colors */
    --notam-color: #ff9800;
    --adsb-color: #f44336;
    --weather-color: #2196f3;
    --faa-color: #ff5722;
    --system-color: #607d8b;
  }

  .toast-stack {
    /* Hardware acceleration */
    transform: translate3d(0, 0, 0);
    backface-visibility: hidden;
  }
</style>
```

### Accordion/Tab Features

```typescript
class MessageAccordion {
  private expanded = false;
  private groupedMessages: Map<MessageCategory, Message[]>;

  toggleExpanded(): void {
    this.expanded = !this.expanded;
    this.animateTransition();
  }

  // Group by category for tabs
  groupMessages(messages: Message[]): void {
    this.groupedMessages.clear();

    for (const msg of messages) {
      if (!this.groupedMessages.has(msg.category)) {
        this.groupedMessages.set(msg.category, []);
      }
      this.groupedMessages.get(msg.category)!.push(msg);
    }
  }
}
```

### Performance Optimizations

1. **Virtual Scrolling**: For expanded message list
2. **Message Pooling**: Reuse DOM elements
3. **Transition Optimization**: CSS-only animations
4. **Batch Updates**: Debounce rapid messages
5. **Memory Management**: Auto-expire old messages

### Testing Requirements

```typescript
describe('MessageSystem', () => {
  test('handles 1000+ messages without memory leak');
  test('maintains 60fps during toast animations');
  test('priority queue orders correctly');
  test('Tauri bridge handles all message types');
  test('accordion smoothly handles overflow');
});
```

### Deliverables

1. `MessageSystem.svelte` - Main component
2. `MessageQueue.ts` - Priority queue implementation
3. `TauriMessageBridge.ts` - Backend integration
4. `ToastStack.svelte` - Visual toast component
5. `MessageAccordion.svelte` - Overflow handling
6. Performance benchmarks

Remember: Critical information delivered instantly. Every alert visible, every animation smooth.
