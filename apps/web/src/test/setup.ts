import '@testing-library/jest-dom';

// jsdom does not implement fetch; give tests a spyable stub to override per-case.
if (typeof global.fetch !== 'function') {
  global.fetch = jest.fn();
}
