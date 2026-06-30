import { describe, it, expect } from '@jest/globals';
import { getLicenseTier, isProLicense, getStoredLicense } from '../src/license/validator.js';

describe('isProLicense', () => {
  it('returns false when no license is stored', () => {
    expect(isProLicense()).toBe(false);
  });
});

describe('getLicenseTier', () => {
  it('returns free when no license is stored', () => {
    expect(getLicenseTier()).toBe('free');
  });
});

describe('getStoredLicense', () => {
  it('returns null when no license file exists', () => {
    expect(getStoredLicense()).toBeNull();
  });
});
