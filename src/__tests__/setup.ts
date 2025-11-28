// Test setup file
// Note: These dependencies are optional and only needed if running tests
// If vitest is not installed, this file will be skipped

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { expect, afterEach } = require('vitest');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { cleanup } = require('@testing-library/react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const matchers = require('@testing-library/jest-dom/matchers');

  // Extend Vitest's expect with jest-dom matchers
  if (expect && expect.extend) {
    expect.extend(matchers);
  }

  // Cleanup after each test
  if (afterEach) {
    afterEach(() => {
      if (cleanup) cleanup();
      // Clear localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    });
  }
} catch (e) {
  // Test dependencies not installed - skip setup
  console.warn('Test dependencies not available, skipping test setup');
}

