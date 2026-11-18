import type {
  NotificationSettings,
  NotificationSettingsBody,
  SavedScheme,
  UpdateSavedBody,
} from '@shared/schemas'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'

const path = (schemeId: string) => `/saved/${encodeURIComponent(schemeId)}`

export const listSaved = () => apiGet<SavedScheme[]>('/saved')
export const saveScheme = (schemeId: string) => apiPost<SavedScheme>('/saved', { schemeId })
export const updateSaved = (schemeId: string, body: UpdateSavedBody) =>
  apiPatch<SavedScheme>(path(schemeId), body)
export const removeSaved = (schemeId: string) => apiDelete<void>(path(schemeId))

export const getNotificationSettings = () => apiGet<NotificationSettings>('/notifications/settings')
export const updateNotificationSettings = (body: NotificationSettingsBody) =>
  apiPatch<NotificationSettings>('/notifications/settings', body)
