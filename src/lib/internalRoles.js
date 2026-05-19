export const INTERNAL_ROLES = ['terranexa_admin', 'comercial', 'suporte']

export function isInternalUser(profile) {
  return INTERNAL_ROLES.includes(profile?.papel)
}

