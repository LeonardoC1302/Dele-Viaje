import { describe, expect, it } from 'vitest';
import { loginSchema, signupSchema } from './auth';

describe('loginSchema', () => {
  it('accepts a valid email and non-empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'anything',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'anything',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('signupSchema', () => {
  it('accepts a password with a letter and a number, 8+ chars', () => {
    const result = signupSchema.safeParse({
      email: 'user@example.com',
      password: 'password1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a password missing a number', () => {
    const result = signupSchema.safeParse({
      email: 'user@example.com',
      password: 'passwordonly',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = signupSchema.safeParse({
      email: 'user@example.com',
      password: 'a1',
    });
    expect(result.success).toBe(false);
  });
});
