import { describe, expect, it } from 'vitest'
import { decrypt, encrypt } from './crypto.js'

describe('field encryption', () => {
  it.each([[250000], ['SC'], [{ has: true, percent: 40 }], [0], [false]])(
    'round-trips %j with its type intact',
    (value) => {
      expect(decrypt(encrypt(value))).toEqual(value)
    },
  )

  it('stores iv:tag:ciphertext with a 12-byte IV and 16-byte tag', () => {
    const [iv, tag, ciphertext] = encrypt('SC').split(':')
    expect(Buffer.from(iv, 'base64')).toHaveLength(12)
    expect(Buffer.from(tag, 'base64')).toHaveLength(16)
    expect(ciphertext).not.toContain('SC')
  })

  it('uses a new IV each time, so equal values never look equal', () => {
    expect(encrypt('SC')).not.toBe(encrypt('SC'))
  })

  it('rejects a changed ciphertext', () => {
    const [iv, tag, ciphertext] = encrypt(250000).split(':')
    const bytes = Buffer.from(ciphertext, 'base64')
    bytes[0] ^= 1
    expect(() => decrypt([iv, tag, bytes.toString('base64')].join(':'))).toThrow()
  })

  it('rejects a shortened auth tag', () => {
    const [iv, tag, ciphertext] = encrypt(250000).split(':')
    const short = Buffer.from(tag, 'base64').subarray(0, 4).toString('base64')
    expect(() => decrypt([iv, short, ciphertext].join(':'))).toThrow()
  })

  it('rejects a value in the wrong format', () => {
    expect(() => decrypt('not-encrypted')).toThrow('malformed')
  })
})
