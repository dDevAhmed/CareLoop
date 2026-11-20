const { execSync } = require('child_process');
const path = require('path');

console.log('CareLoop: Resetting database store to deterministic synthetic baseline...');
try {
  execSync('npx vitest run src/scripts/resetStore.test.ts', {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '../../'),
  });
  console.log('Deterministic seed reset complete.');
} catch (err) {
  console.error('CareLoop demo reset failed:', err.message);
  process.exit(1);
}
