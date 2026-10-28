import type { User } from './auth'

export type Profile = User

export interface UpdateProfileRequest {
  displayName?: string
  username?: string
  email?: string
  ensName?: string | null
}

/** PUT /profile/avatar. Upload simulado: imagem como data URL. */
export interface UpdateAvatarRequest {
  dataUrl: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}
