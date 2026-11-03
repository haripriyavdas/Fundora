// Vitest setup file: runs before each test file imports config/env.ts. Fake values only.
process.env.NODE_ENV = 'test'
process.env.APP_URL = 'http://localhost:3000'
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/fundora_test' // replaced by the in-memory server
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long'
process.env.FIELD_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
process.env.EMAIL_PROVIDER = 'console'
process.env.EMAIL_FROM = 'Fundora <test@example.com>'
process.env.TEAM_INBOX = 'team@example.com'
