import type { Profile, ProfileUpdateBody } from '@shared/schemas'
import { apiGet, apiPut } from '@/lib/api'

export const getProfile = () => apiGet<Profile>('/profile')
export const saveProfile = (body: ProfileUpdateBody) => apiPut<Profile>('/profile', body)
