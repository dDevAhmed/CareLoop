import { describe, it, expect, afterAll } from 'vitest';
import { runSeedCli } from './seed';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Generate synthetic records files for all packs', () => {
  const tempDir = path.join(os.tmpdir(), `careloop-seed-test-${Date.now()}`);

  afterAll(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup error in temp
    }
  });

  it('writes synthetic_cases_2000.json to temp directory for abu-dhabi', () => {
    const writtenPath = runSeedCli('abu-dhabi', 100, tempDir);
    expect(fs.existsSync(writtenPath)).toBe(true);
    const stat = fs.statSync(writtenPath);
    expect(stat.size).toBeGreaterThan(50000); // Valid synthetic JSON output
  });

  it('writes synthetic_cases_who-reference.json to temp directory', () => {
    const writtenPath = runSeedCli('who-reference', 50, tempDir);
    expect(fs.existsSync(writtenPath)).toBe(true);
    const stat = fs.statSync(writtenPath);
    expect(stat.size).toBeGreaterThan(25000);
  });

  it('writes synthetic_cases_low-resource.json to temp directory', () => {
    const writtenPath = runSeedCli('low-resource', 50, tempDir);
    expect(fs.existsSync(writtenPath)).toBe(true);
    const stat = fs.statSync(writtenPath);
    expect(stat.size).toBeGreaterThan(25000);
  });
});
