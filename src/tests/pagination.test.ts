import { describe, it, expect } from 'vitest';
import { getPaginationItems } from '../components/Pagination';

describe('Pagination Component Logic & Sliding Window Calculations', () => {
  it('1. Returns empty array when totalPages <= 0', () => {
    expect(getPaginationItems(1, 0)).toEqual([]);
    expect(getPaginationItems(0, -5)).toEqual([]);
  });

  it('2. Shows all pages sequentially when totalPages <= 7 (no ellipses)', () => {
    expect(getPaginationItems(1, 1)).toEqual([1]);
    expect(getPaginationItems(2, 4)).toEqual([1, 2, 3, 4]);
    expect(getPaginationItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('3. Near start (e.g. page 1 of 201): displays first 5 pages, ellipsis, and last page', () => {
    // Current is 1, delta = 2 -> window [1, 2, 3, 4, 5], '...', 201
    const items = getPaginationItems(1, 201, 2);
    expect(items).toEqual([1, 2, 3, 4, 5, '...', 201]);
  });

  it('4. Close to start (page 4 of 201): 2 back (2, 3), current (4), 2 forward (5, 6), then ellipsis and 201', () => {
    // Current is 4, delta = 2 -> 1, 2, 3, 4, 5, 6, '...', 201
    const items = getPaginationItems(4, 201, 2);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, '...', 201]);
  });

  it('5. Middle of large range (page 50 of 201): 1, ..., 48, 49, 50, 51, 52, ..., 201', () => {
    const items = getPaginationItems(50, 201, 2);
    expect(items).toEqual([1, '...', 48, 49, 50, 51, 52, '...', 201]);
  });

  it('6. Close to end (page 198 of 201): 1, ..., 196, 197, 198, 199, 200, 201', () => {
    const items = getPaginationItems(198, 201, 2);
    expect(items).toEqual([1, '...', 196, 197, 198, 199, 200, 201]);
  });

  it('7. Last page (page 201 of 201): 1, ..., 197, 198, 199, 200, 201', () => {
    const items = getPaginationItems(201, 201, 2);
    expect(items).toEqual([1, '...', 197, 198, 199, 200, 201]);
  });

  it('8. Supports custom delta (e.g. delta = 1 for 1 back, 1 forward)', () => {
    const items = getPaginationItems(10, 50, 1);
    expect(items).toEqual([1, '...', 9, 10, 11, '...', 50]);
  });
});

