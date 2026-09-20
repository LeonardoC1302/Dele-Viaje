import { describe, expect, it } from 'vitest';
import { formatValidationIssues, extractErrorMessage } from './format-validation-error';

describe('formatValidationIssues', () => {
  it('returns null when there are no issues', () => {
    expect(formatValidationIssues(null)).toBeNull();
    expect(formatValidationIssues(undefined)).toBeNull();
    expect(formatValidationIssues({})).toBeNull();
  });

  it('humanizes a camelCase field name and includes the reason', () => {
    const result = formatValidationIssues({
      fieldErrors: { priceCrc: ['Too small: expected number to be >=1000'] },
    });
    expect(result).toBe('Price crc: Too small: expected number to be >=1000');
  });

  it('joins multiple field errors', () => {
    const result = formatValidationIssues({
      fieldErrors: {
        capacity: ['Required'],
        title: ['Too short'],
      },
    });
    expect(result).toContain('Capacity: Required');
    expect(result).toContain('Title: Too short');
  });

  it('includes top-level form errors', () => {
    const result = formatValidationIssues({
      formErrors: ['End date must be after the start date.'],
    });
    expect(result).toBe('End date must be after the start date.');
  });
});

describe('extractErrorMessage', () => {
  it('prefers field-level detail over the generic message', () => {
    const body = {
      error: {
        message: 'Invalid tour data.',
        issues: { fieldErrors: { priceCrc: ['Required'] } },
      },
    };
    expect(extractErrorMessage(body, 'fallback')).toBe('Price crc: Required');
  });

  it('falls back to the generic message when there are no issues', () => {
    const body = { error: { message: 'Something specific happened.' } };
    expect(extractErrorMessage(body, 'fallback')).toBe('Something specific happened.');
  });

  it('falls back to the caller-supplied default when the body is empty', () => {
    expect(extractErrorMessage(null, 'fallback')).toBe('fallback');
  });
});
