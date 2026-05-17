#!/usr/bin/env node
/**
 * Stale-suppression detector for ESLint 9's --suppress-all baseline.
 *
 * ESLint 9 surfaces unused entries in eslint-suppressions.json as a console
 * notice ("There are suppressions left that do not occur anymore") but does
 * NOT fail with a non-zero exit code. That makes the default behavior unsuitable
 * for CI as a gate.
 *
 * This script runs `eslint .` and checks stdout/stderr for the notice. If found,
 * it exits 1 (so CI can flag it) and prints a hint for cleanup. If not found,
 * it exits 0.
 *
 * Wired into CI as `continue-on-error: true` initially per docs/decisions.md
 * #lint-suppressions-baseline. Future PRs that touch a file with suppressions
 * should leave the suppressions list smaller (or unchanged); growth and stale
 * entries both surface here.
 *
 * To clean up stale entries locally:
 *   npm run lint:suppressions-prune
 */
const { spawnSync } = require('node:child_process');

const result = spawnSync('npx', ['eslint', '.'], {
  encoding: 'utf8',
  shell: true,
});

const combined = (result.stdout || '') + (result.stderr || '');
const stalePattern = /suppressions left that do not occur anymore/i;

if (stalePattern.test(combined)) {
  console.log('Stale entries detected in eslint-suppressions.json.');
  console.log('');
  console.log('A previous violation has been fixed but its suppression entry remains.');
  console.log('Run `npm run lint:suppressions-prune` from client/max-method/ to clean up,');
  console.log('then commit the updated eslint-suppressions.json with the batch that fixed it.');
  console.log('');
  console.log('See docs/decisions.md#lint-suppressions-baseline for the shrinkage discipline.');
  process.exit(1);
}

console.log('No stale suppressions detected.');
process.exit(0);
