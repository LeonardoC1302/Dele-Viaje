import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('resolves conflicting Tailwind utilities, keeping the last one', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });
});
