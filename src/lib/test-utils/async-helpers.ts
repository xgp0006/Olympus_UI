/**
 * Async Testing Helpers
 * Utilities for testing asynchronous operations and timing
 */

import { vi } from 'vitest';
import { waitFor } from '@testing-library/svelte';

/**
 * Wait for a specific condition to be true
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 50
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Wait for a promise to resolve or reject
 */
export async function waitForPromise<T>(
  promise: Promise<T>,
  timeout = 5000
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Promise timed out after ${timeout}ms`)), timeout)
    )
  ]);
}

/**
 * Wait for multiple promises with different timeouts
 */
export async function waitForMultiplePromises<T>(
  promises: Array<{ promise: Promise<T>; timeout?: number }>,
  defaultTimeout = 5000
): Promise<T[]> {
  const promisesWithTimeout = promises.map(({ promise, timeout = defaultTimeout }) =>
    waitForPromise(promise, timeout)
  );

  return Promise.all(promisesWithTimeout);
}

/**
 * Wait for an element to appear in the DOM
 */
export async function waitForElement(
  container: HTMLElement,
  selector: string,
  timeout = 5000
): Promise<HTMLElement> {
  return waitForCondition(
    () => {
      const element = container.querySelector(selector) as HTMLElement;
      return element !== null;
    },
    timeout
  ).then(() => container.querySelector(selector) as HTMLElement);
}

/**
 * Wait for an element to disappear from the DOM
 */
export async function waitForElementToDisappear(
  container: HTMLElement,
  selector: string,
  timeout = 5000
): Promise<void> {
  return waitForCondition(
    () => container.querySelector(selector) === null,
    timeout
  );
}

/**
 * Wait for text content to appear
 */
export async function waitForTextContent(
  container: HTMLElement,
  text: string,
  timeout = 5000
): Promise<void> {
  return waitForCondition(
    () => container.textContent?.includes(text) ?? false,
    timeout
  );
}

/**
 * Wait for a specific number of elements
 */
export async function waitForElementCount(
  container: HTMLElement,
  selector: string,
  count: number,
  timeout = 5000
): Promise<void> {
  return waitForCondition(
    () => container.querySelectorAll(selector).length === count,
    timeout
  );
}

/**
 * Wait for a store value to change
 */
export async function waitForStoreValue<T>(
  store: { subscribe: (callback: (value: T) => void) => () => void },
  expectedValue: T,
  timeout = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Store value did not change to expected value within ${timeout}ms`));
    }, timeout);

    const unsubscribe = store.subscribe((value) => {
      if (JSON.stringify(value) === JSON.stringify(expectedValue)) {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve();
      }
    });
  });
}

/**
 * Wait for a mock function to be called
 */
export async function waitForMockCall(
  mockFn: any,
  timeout = 5000
): Promise<void> {
  return waitForCondition(
    () => mockFn.mock.calls.length > 0,
    timeout
  );
}

/**
 * Wait for a mock function to be called with specific arguments
 */
export async function waitForMockCallWith(
  mockFn: any,
  expectedArgs: unknown[],
  timeout = 5000
): Promise<void> {
  return waitForCondition(
    () => {
      return mockFn.mock.calls.some((call: unknown[]) =>
        JSON.stringify(call) === JSON.stringify(expectedArgs)
      );
    },
    timeout
  );
}

/**
 * Wait for animation to complete
 */
export async function waitForAnimation(duration = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

/**
 * Wait for next tick (useful for reactive updates)
 */
export async function waitForNextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Wait for multiple ticks
 */
export async function waitForTicks(count = 1): Promise<void> {
  for (let i = 0; i < count; i++) {
    await waitForNextTick();
  }
}

/**
 * Advance timers and wait for updates
 */
export async function advanceTimersAndWait(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms);
  await waitForNextTick();
}

/**
 * Run all timers and wait for updates
 */
export async function runAllTimersAndWait(): Promise<void> {
  vi.runAllTimers();
  await waitForNextTick();
}

/**
 * Wait for idle (no pending timers or promises)
 */
export async function waitForIdle(timeout = 1000): Promise<void> {
  return waitForCondition(
    async () => {
      // Check if there are any pending timers
      const hasPendingTimers = vi.getTimerCount() > 0;
      
      if (hasPendingTimers) {
        return false;
      }

      // Wait a tick to see if any new async operations start
      await waitForNextTick();
      return vi.getTimerCount() === 0;
    },
    timeout,
    10
  );
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 100
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Create a deferred promise for manual resolution
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} {
  let resolve: (value: T) => void;
  let reject: (error: Error) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve: resolve!, reject: reject! };
}

/**
 * Wait for a specific event to be dispatched
 */
export async function waitForEvent(
  element: HTMLElement,
  eventType: string,
  timeout = 5000
): Promise<Event> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      element.removeEventListener(eventType, handler);
      reject(new Error(`Event "${eventType}" was not dispatched within ${timeout}ms`));
    }, timeout);

    const handler = (event: Event) => {
      clearTimeout(timeoutId);
      element.removeEventListener(eventType, handler);
      resolve(event);
    };

    element.addEventListener(eventType, handler);
  });
}