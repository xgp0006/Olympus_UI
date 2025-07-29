/**
 * Bounded Array implementation for NASA JPL Rule 2 compliance
 * Prevents unbounded memory growth by limiting array size
 */

/**
 * A bounded array that automatically removes oldest items when limit is reached
 * NASA JPL Rule 2: All loops and arrays must have fixed bounds
 */
export class BoundedArray<T> {
  private items: T[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number) {
    if (maxSize <= 0) {
      throw new Error('BoundedArray maxSize must be positive');
    }
    this.maxSize = maxSize;
  }

  /**
   * Add item to array, removing oldest if at capacity
   * NASA JPL Rule 2: Bounded memory allocation
   */
  push(item: T): void {
    if (this.items.length >= this.maxSize) {
      this.items.shift(); // Remove oldest item
    }
    this.items.push(item);
  }

  /**
   * Add multiple items, maintaining size limit
   */
  pushMany(items: T[]): void {
    for (const item of items) {
      this.push(item);
    }
  }

  /**
   * Get all items in the array
   */
  getAll(): T[] {
    return [...this.items]; // Return copy to prevent external modification
  }

  /**
   * Get current size
   */
  get length(): number {
    return this.items.length;
  }

  /**
   * Get maximum size
   */
  get maxLength(): number {
    return this.maxSize;
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.items.length = 0;
  }

  /**
   * Check if array is at capacity
   */
  isFull(): boolean {
    return this.items.length >= this.maxSize;
  }

  /**
   * Get item at index
   */
  at(index: number): T | undefined {
    return this.items[index];
  }

  /**
   * Get last item
   */
  last(): T | undefined {
    return this.items[this.items.length - 1];
  }

  /**
   * Get first item
   */
  first(): T | undefined {
    return this.items[0];
  }

  /**
   * Remove and return last item
   */
  pop(): T | undefined {
    return this.items.pop();
  }

  /**
   * Find item matching predicate
   */
  find(predicate: (item: T) => boolean): T | undefined {
    return this.items.find(predicate);
  }

  /**
   * Filter items matching predicate
   */
  filter(predicate: (item: T) => boolean): T[] {
    return this.items.filter(predicate);
  }

  /**
   * Map items to new array
   */
  map<U>(mapper: (item: T) => U): U[] {
    return this.items.map(mapper);
  }

  /**
   * Check if any item matches predicate
   */
  some(predicate: (item: T) => boolean): boolean {
    return this.items.some(predicate);
  }

  /**
   * Check if all items match predicate
   */
  every(predicate: (item: T) => boolean): boolean {
    return this.items.every(predicate);
  }

  /**
   * Iterate over items
   */
  forEach(callback: (item: T, index: number) => void): void {
    this.items.forEach(callback);
  }

  /**
   * Convert to regular array
   */
  toArray(): T[] {
    return [...this.items];
  }
}

/**
 * Factory function for creating bounded arrays
 */
export function createBoundedArray<T>(maxSize: number, initialItems?: T[]): BoundedArray<T> {
  const array = new BoundedArray<T>(maxSize);
  if (initialItems) {
    array.pushMany(initialItems);
  }
  return array;
}

/**
 * Type guard to check if value is BoundedArray
 */
export function isBoundedArray<T>(value: unknown): value is BoundedArray<T> {
  return value instanceof BoundedArray;
}