import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DESIGN_TOKENS } from '../design-tokens';

/**
 * Design Tokens Verification Test Suite
 * Enforces architectural rule: No hard-coded hex color strings are allowed
 * in UI components. All styling must reference design tokens or CSS variables.
 */

function getFilesRecursively(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getFilesRecursively(fullPath, fileList);
    } else if (/\.(tsx|ts|jsx|js)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

describe('CareLoop Brand Alignment & Design Tokens Compliance', () => {
  it('1. Design tokens constants are exported with all required brand palette values', () => {
    expect(DESIGN_TOKENS.colors.teal).toBe('#087F83');
    expect(DESIGN_TOKENS.colors.deepTeal).toBe('#0F5E63');
    expect(DESIGN_TOKENS.colors.navy).toBe('#142747');
    expect(DESIGN_TOKENS.colors.coral).toBe('#E98278');
    expect(DESIGN_TOKENS.colors.pageBg).toBe('#F2F8F7');
    expect(DESIGN_TOKENS.colors.mist).toBe('#EAF4F3');
    expect(DESIGN_TOKENS.colors.border).toBe('#DCE7E6');
    expect(DESIGN_TOKENS.colors.mutedText).toBe('#55657B');
    expect(DESIGN_TOKENS.colors.alertText).toBe('#A8321F');
    expect(DESIGN_TOKENS.colors.alertTint).toBe('#FCE4E1');
    expect(DESIGN_TOKENS.colors.neutralChip).toBe('#E8EEF5');

    // Typography & dimensions
    expect(DESIGN_TOKENS.typography.fontFamily).toContain('Manrope');
    expect(DESIGN_TOKENS.layout.sidebarWidth).toBe('232px');
    expect(DESIGN_TOKENS.layout.previewDrawerWidth).toBe('360px');
  });

  it('2. Zero raw hex color literals exist in src/components', () => {
    const componentsDir = path.resolve(__dirname, '../components');
    const files = getFilesRecursively(componentsDir);

    const hexPattern = /#([0-9a-fA-F]{3,8})\b/g;
    const violations: { file: string; line: number; match: string }[] = [];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        // Skip comment lines or SVG path definition lines if any
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
        const matches = line.match(hexPattern);
        if (matches) {
          matches.forEach((m) => {
            violations.push({
              file: path.basename(filePath),
              line: index + 1,
              match: m,
            });
          });
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it('3. Zero raw hex color literals exist in src/app page components (outside globals.css and tokens)', () => {
    const appDir = path.resolve(__dirname, '../app');
    const files = getFilesRecursively(appDir);

    const hexPattern = /#([0-9a-fA-F]{3,8})\b/g;
    const violations: { file: string; line: number; match: string }[] = [];

    for (const filePath of files) {
      // Exclude API route mock seeds or non-UI files if any, only check .tsx UI pages
      if (!filePath.endsWith('.tsx')) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
        const matches = line.match(hexPattern);
        if (matches) {
          matches.forEach((m) => {
            violations.push({
              file: path.basename(filePath),
              line: index + 1,
              match: m,
            });
          });
        }
      });
    }

    expect(violations).toEqual([]);
  });
});

