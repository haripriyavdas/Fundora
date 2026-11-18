import { Router } from 'express'
import {
  SavedParams,
  SaveSchemeBody,
  UpdateSavedBody,
  type SavedScheme,
} from '../../shared/schemas/index.js'
import { requireAccount } from '../middleware/requireAccount.js'
import { requireAuth, userId } from '../middleware/requireAuth.js'
import { validate } from '../middleware/validate.js'
import { listSaved, removeSaved, saveScheme, updateSaved } from '../services/saved.js'

/** The student's tracker. Every query is scoped to the session user. */
export const savedRouter = Router()

savedRouter.use(requireAuth, requireAccount)

savedRouter.get('/', async (req, res) => {
  res.json((await listSaved(userId(req))) satisfies SavedScheme[])
})

savedRouter.post('/', validate({ body: SaveSchemeBody }), async (req, res) => {
  const { schemeId } = req.body as SaveSchemeBody
  res.status(201).json((await saveScheme(userId(req), schemeId)) satisfies SavedScheme)
})

savedRouter.patch(
  '/:schemeId',
  validate({ params: SavedParams, body: UpdateSavedBody }),
  async (req, res) => {
    const { schemeId } = req.params as { schemeId: string }
    const saved = await updateSaved(userId(req), schemeId, req.body as UpdateSavedBody)
    res.json(saved satisfies SavedScheme)
  },
)

savedRouter.delete('/:schemeId', validate({ params: SavedParams }), async (req, res) => {
  const { schemeId } = req.params as { schemeId: string }
  await removeSaved(userId(req), schemeId)
  res.status(204).end()
})
