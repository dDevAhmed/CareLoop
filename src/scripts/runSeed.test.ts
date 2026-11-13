import { describe, it, expect } from 'vitest';
import { runSeedCli } from './seed';
import fs from 'fs';
import path from 'path';

describe('Generate synthetic records files for all packs', () => {
  it('writes data/synthetic_cases_2000.json for abu-dhabi', () => {
    runSeedCli('abu-dhabi', 2000);
    const filePath = path.join(process.cwd(), 'data', 'synthetic_cases_2000.json');
    expect(fs.existsSync(filePath)).toBe(true);
    const stat = fs.statSync(filePath);
    expect(stat.size).toBeGreaterThan(1000000); // > 1MB of synthetic data
  });

  it('writes data/synthetic_cases_who-reference.json', () => {
    runSeedCli('who-reference', 500);
    const filePath = path.join(process.cwd(), 'data', 'synthetic_cases_who-reference.json');
    expect(fs.existsSync(filePath)).toBe(true);
    const stat = fs.statSync(filePath);
    expect(stat.size).toBeGreaterThan(250000);
  });

  it('writes data/synthetic_cases_low-resource.json', () => {
    runSeedCli('low-resource', 500);
    const filePath = path.join(process.cwd(), 'data', 'synthetic_cases_low-resource.json');
    expect(fs.existsSync(filePath)).toBe(true);
    const stat = fs.statSync(filePath);
    expect(stat.size).toBeGreaterThan(250000);
  });
});
