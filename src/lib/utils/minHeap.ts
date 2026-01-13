/**
 * minHeap.ts
 *
 * Generic Min-Heap data structure for O(log N) LRU cache operations.
 *
 * Features:
 * - insert: O(log N)
 * - extractMin: O(log N)
 * - updatePriority: O(log N)
 * - peek: O(1)
 * - has: O(1)
 *
 * Used by:
 * - wadoRsRenderedCache.ts (Rendered frame ArrayBuffer cache)
 * - wadoRsRenderedLoader.ts (IImage object cache)
 */

/**
 * Heap entry with key, value, and priority
 */
interface HeapEntry<K, V> {
  key: K
  value: V
  priority: number
  index: number // Index in heap array for O(1) lookup
}

/**
 * Generic Min-Heap with key-based operations
 *
 * @template K Key type (must be usable as Map key)
 * @template V Value type
 */
export class MinHeap<K, V> {
  private heap: HeapEntry<K, V>[] = []
  private keyMap = new Map<K, HeapEntry<K, V>>()

  /**
   * Current heap size
   */
  get size(): number {
    return this.heap.length
  }

  /**
   * Check if heap is empty
   */
  isEmpty(): boolean {
    return this.heap.length === 0
  }

  /**
   * Check if key exists in heap
   * O(1)
   */
  has(key: K): boolean {
    return this.keyMap.has(key)
  }

  /**
   * Get value by key
   * O(1)
   */
  get(key: K): V | undefined {
    return this.keyMap.get(key)?.value
  }

  /**
   * Peek at minimum element without removing
   * O(1)
   */
  peek(): { key: K; value: V; priority: number } | undefined {
    if (this.heap.length === 0) return undefined
    const min = this.heap[0]
    return { key: min.key, value: min.value, priority: min.priority }
  }

  /**
   * Insert or update an element
   * O(log N)
   *
   * @param key Unique key
   * @param value Associated value
   * @param priority Priority (lower = higher priority in min-heap)
   */
  insert(key: K, value: V, priority: number): void {
    const existing = this.keyMap.get(key)

    if (existing) {
      // Update existing entry
      existing.value = value
      const oldPriority = existing.priority
      existing.priority = priority

      // Re-heapify based on priority change
      if (priority < oldPriority) {
        this.bubbleUp(existing.index)
      } else if (priority > oldPriority) {
        this.bubbleDown(existing.index)
      }
    } else {
      // Insert new entry
      const entry: HeapEntry<K, V> = {
        key,
        value,
        priority,
        index: this.heap.length,
      }
      this.heap.push(entry)
      this.keyMap.set(key, entry)
      this.bubbleUp(entry.index)
    }
  }

  /**
   * Update priority of existing element
   * O(log N)
   *
   * @param key Key to update
   * @param newPriority New priority value
   * @returns true if updated, false if key not found
   */
  updatePriority(key: K, newPriority: number): boolean {
    const entry = this.keyMap.get(key)
    if (!entry) return false

    const oldPriority = entry.priority
    entry.priority = newPriority

    if (newPriority < oldPriority) {
      this.bubbleUp(entry.index)
    } else if (newPriority > oldPriority) {
      this.bubbleDown(entry.index)
    }

    return true
  }

  /**
   * Extract minimum element
   * O(log N)
   */
  extractMin(): { key: K; value: V; priority: number } | undefined {
    if (this.heap.length === 0) return undefined

    const min = this.heap[0]
    this.keyMap.delete(min.key)

    if (this.heap.length === 1) {
      this.heap.pop()
      return { key: min.key, value: min.value, priority: min.priority }
    }

    // Move last element to root and bubble down
    const last = this.heap.pop()!
    this.heap[0] = last
    last.index = 0
    this.bubbleDown(0)

    return { key: min.key, value: min.value, priority: min.priority }
  }

  /**
   * Delete element by key
   * O(log N)
   *
   * @param key Key to delete
   * @returns Deleted value or undefined if not found
   */
  delete(key: K): V | undefined {
    const entry = this.keyMap.get(key)
    if (!entry) return undefined

    this.keyMap.delete(key)
    const index = entry.index
    const value = entry.value

    if (index === this.heap.length - 1) {
      // Last element, just pop
      this.heap.pop()
      return value
    }

    // Replace with last element and re-heapify
    const last = this.heap.pop()!
    this.heap[index] = last
    last.index = index

    // Determine direction to heapify
    const parent = Math.floor((index - 1) / 2)
    if (index > 0 && last.priority < this.heap[parent].priority) {
      this.bubbleUp(index)
    } else {
      this.bubbleDown(index)
    }

    return value
  }

  /**
   * Clear all elements
   * O(1)
   */
  clear(): void {
    this.heap = []
    this.keyMap.clear()
  }

  /**
   * Iterate over all entries (not in sorted order)
   */
  *entries(): IterableIterator<{ key: K; value: V; priority: number }> {
    for (const entry of this.heap) {
      yield { key: entry.key, value: entry.value, priority: entry.priority }
    }
  }

  /**
   * Get all keys
   */
  keys(): K[] {
    return Array.from(this.keyMap.keys())
  }

  /**
   * Bubble up element at index
   */
  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2)
      if (this.heap[index].priority >= this.heap[parentIndex].priority) {
        break
      }
      this.swap(index, parentIndex)
      index = parentIndex
    }
  }

  /**
   * Bubble down element at index
   */
  private bubbleDown(index: number): void {
    const length = this.heap.length

    while (true) {
      const leftChild = 2 * index + 1
      const rightChild = 2 * index + 2
      let smallest = index

      if (
        leftChild < length &&
        this.heap[leftChild].priority < this.heap[smallest].priority
      ) {
        smallest = leftChild
      }

      if (
        rightChild < length &&
        this.heap[rightChild].priority < this.heap[smallest].priority
      ) {
        smallest = rightChild
      }

      if (smallest === index) break

      this.swap(index, smallest)
      index = smallest
    }
  }

  /**
   * Swap two elements and update their indices
   */
  private swap(i: number, j: number): void {
    const temp = this.heap[i]
    this.heap[i] = this.heap[j]
    this.heap[j] = temp

    this.heap[i].index = i
    this.heap[j].index = j
  }
}

/**
 * LRU Cache using MinHeap for O(log N) eviction
 *
 * Priority semantics:
 * - Lower priority = evicted first (MinHeap extracts minimum)
 * - accessCounter increases on each access/insert
 * - Older items have lower counter → evicted first (LRU behavior)
 *
 * @template K Key type
 * @template V Value type
 */
export class LRUHeapCache<K, V> {
  private heap: MinHeap<K, { value: V; size: number }>
  private maxEntries: number
  private maxBytes: number
  private currentBytes = 0
  // Access counter for LRU: lower = older = evicted first
  private accessCounter = 0

  constructor(options: { maxEntries?: number; maxBytes?: number } = {}) {
    this.heap = new MinHeap()
    this.maxEntries = options.maxEntries ?? Infinity
    this.maxBytes = options.maxBytes ?? Infinity
  }

  get size(): number {
    return this.heap.size
  }

  get bytes(): number {
    return this.currentBytes
  }

  /**
   * Check if key exists
   */
  has(key: K): boolean {
    return this.heap.has(key)
  }

  /**
   * Get value and update access time (LRU)
   */
  get(key: K): V | undefined {
    const entry = this.heap.get(key)
    if (entry) {
      // Update access counter: higher = more recent = evicted later (LRU)
      this.heap.updatePriority(key, this.accessCounter++)
      return entry.value
    }
    return undefined
  }

  /**
   * Peek value without updating access time
   */
  peek(key: K): V | undefined {
    return this.heap.get(key)?.value
  }

  /**
   * Set value with size
   */
  set(key: K, value: V, size: number = 0): void {
    // Check if already exists
    const existing = this.heap.get(key)
    if (existing) {
      // Update existing: adjust size
      const sizeDiff = size - existing.size
      // Evict if new size exceeds limit
      if (sizeDiff > 0) {
        this.evictIfNeeded(sizeDiff)
      }
      this.currentBytes -= existing.size
      this.currentBytes += size
      this.heap.insert(key, { value, size }, this.accessCounter++)
      return
    }

    // Evict if necessary (before adding new item)
    this.evictIfNeeded(size)

    // Insert new item
    this.heap.insert(key, { value, size }, this.accessCounter++)
    this.currentBytes += size
  }

  /**
   * Delete by key
   */
  delete(key: K): boolean {
    const entry = this.heap.delete(key)
    if (entry) {
      this.currentBytes -= entry.size
      return true
    }
    return false
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.heap.clear()
    this.currentBytes = 0
    this.accessCounter = 0
  }

  /**
   * Delete entries matching predicate
   */
  deleteMatching(predicate: (key: K) => boolean): number {
    const keysToDelete = this.heap.keys().filter(predicate)
    let deleted = 0

    for (const key of keysToDelete) {
      if (this.delete(key)) {
        deleted++
      }
    }

    return deleted
  }

  /**
   * Iterate over all entries
   */
  *entries(): IterableIterator<{ key: K; value: V; size: number }> {
    for (const entry of this.heap.entries()) {
      yield { key: entry.key, value: entry.value.value, size: entry.value.size }
    }
  }

  /**
   * Evict oldest entries to make room
   * Order: maxBytes first (more critical), then maxEntries
   */
  private evictIfNeeded(newSize: number): number {
    let evicted = 0

    // Evict by byte size first (more critical constraint)
    while (this.currentBytes + newSize > this.maxBytes && this.heap.size > 0) {
      const min = this.heap.extractMin()
      if (!min) break
      this.currentBytes -= min.value.size
      evicted++
    }

    // Evict by entry count
    while (this.heap.size >= this.maxEntries && this.heap.size > 0) {
      const min = this.heap.extractMin()
      if (!min) break
      this.currentBytes -= min.value.size
      evicted++
    }

    return evicted
  }
}
