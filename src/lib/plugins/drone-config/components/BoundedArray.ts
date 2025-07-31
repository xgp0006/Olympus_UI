/**
 * NASA JPL Rule 2: Bounded memory allocation
 * BoundedArray implementation for aerospace-grade safety
 * Memory-safe implementation with circular buffer behavior
 */
export class BoundedArray<T> {
	private items: T[];
	private readonly maxSize: number;
	private defaultFactory?: () => T;
	
	constructor(maxSize: number, defaultFactory?: () => T) {
		if (maxSize <= 0) {
			throw new Error('BoundedArray size must be positive');
		}
		this.maxSize = maxSize;
		this.items = [];
		this.defaultFactory = defaultFactory;
	}
	
	/**
	 * Push item to array - removes oldest if at capacity (circular buffer)
	 * NASA JPL Rule 2: Bounded memory allocation
	 */
	push(item: T): boolean {
		if (this.items.length >= this.maxSize) {
			this.items.shift(); // Remove oldest item
		}
		this.items.push(item);
		return true;
	}
	
	/**
	 * Get item at index - memory safe access
	 */
	get(index: number): T | undefined {
		if (index < 0 || index >= this.items.length) {
			return undefined;
		}
		return this.items[index];
	}
	
	/**
	 * Remove item matching predicate
	 */
	remove(predicate: (item: T) => boolean): boolean {
		const index = this.items.findIndex(predicate);
		if (index === -1) {
			return false;
		}
		this.items.splice(index, 1);
		return true;
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
	map<U>(fn: (item: T) => U): U[] {
		return this.items.map(fn);
	}
	
	/**
	 * Iterate over items
	 */
	forEach(fn: (item: T, index: number) => void): void {
		this.items.forEach(fn);
	}
	
	/**
	 * Get current length
	 */
	get length(): number {
		return this.items.length;
	}
	
	/**
	 * Check if at capacity
	 */
	get isFull(): boolean {
		return this.items.length >= this.maxSize;
	}
	
	/**
	 * Get all items as array (copy for safety)
	 */
	toArray(): T[] {
		return [...this.items];
	}
	
	/**
	 * Clear all items
	 */
	clear(): void {
		this.items = [];
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
}