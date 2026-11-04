import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { env } from '../config/env.js'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const TAG_BYTES = 16

const key = Buffer.from(env.FIELD_ENCRYPTION_KEY, 'base64')

/** Encrypts any JSON value with a fresh IV. Returns `iv:tag:ciphertext`, each part base64. */
export function encrypt(value: unknown): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES })
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64')).join(':')
}

/** Reverses encrypt(). Throws on a malformed, tampered or wrong-key value. */
export function decrypt(blob: string): unknown {
  const parts = blob.split(':')
  if (parts.length !== 3) throw new Error('malformed encrypted value')
  const [iv, tag, ciphertext] = parts.map((part) => Buffer.from(part, 'base64'))
  // A fixed tag length stops a shortened tag from being accepted
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES })
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return JSON.parse(plain.toString('utf8'))
}
