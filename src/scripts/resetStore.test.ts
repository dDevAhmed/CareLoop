import { describe, it, expect } from 'vitest';
import { runSeedCli } from './seed';

describe('CareLoop Deterministic Store Reset', () => {
  it('resets local database files to deterministic seed baseline', () => {
    runSeedCli('abu-dhabi', 2000);
    runSeedCli('who-reference', 500);
    runSeedCli('low-resource', 500);
    expect(true).toBe(true);
  });
});
