import '@testing-library/jest-dom';
import React from 'react';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Expose React globally for older JSX compilation transforms
global.React = React;

// Cleanup React DOM trees after each test case
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock window.matchMedia for Recharts / responsiveness tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.confirm (used in JournalPage delete confirmation)
window.confirm = vi.fn(() => true);

// Mock Service Worker Registration APIs
Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: vi.fn().mockResolvedValue({ scope: '/' }),
    ready: new Promise(() => {}),
  },
});
