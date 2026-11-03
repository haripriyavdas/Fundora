import { describe, expect, it } from 'vitest'
import { LoginBody, NewPasswordSchema, RegisterBody, TokenBody } from './auth.js'

describe('auth schemas', () => {
  it('normalises email to trimmed lowercase', () => {
    expect(LoginBody.parse({ email: '  Asha@Example.COM ', password: 'x' }).email).toBe(
      'asha@example.com',
    )
  })

  it.each([
    ['7 chars', 'abcdefg', false],
    ['8 chars', 'abcdefgh', false], // on the common list
    ['8 chars, uncommon', 'mango-42', true],
    ['72 bytes', 'a'.repeat(72), true],
    ['73 bytes', 'a'.repeat(73), false],
    ['multibyte over 72 bytes', 'ಕ'.repeat(25), false], // 3 bytes each = 75
    ['common, different case', 'PassWord123', false],
  ])('new password %s → %s', (_name, password, ok) => {
    expect(NewPasswordSchema.safeParse(password).success).toBe(ok)
  })

  it('register needs consent === true', () => {
    const base = { email: 'a@example.com', password: 'mango-river-42' }
    expect(RegisterBody.safeParse({ ...base, consent: true }).success).toBe(true)
    expect(RegisterBody.safeParse({ ...base, consent: 'true' }).success).toBe(false)
    expect(RegisterBody.safeParse(base).success).toBe(false)
  })

  it('register strips unknown keys', () => {
    const parsed = RegisterBody.parse({
      email: 'a@example.com',
      password: 'mango-river-42',
      consent: true,
      role: 'admin',
    })
    expect(parsed).not.toHaveProperty('role')
  })

  it('tokens must be 43 base64url characters', () => {
    expect(TokenBody.safeParse({ token: 'A'.repeat(43) }).success).toBe(true)
    expect(TokenBody.safeParse({ token: 'A'.repeat(42) }).success).toBe(false)
    expect(TokenBody.safeParse({ token: `${'A'.repeat(42)}$` }).success).toBe(false)
  })
})
