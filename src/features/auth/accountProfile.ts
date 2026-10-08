import type { User } from '@supabase/supabase-js'

export type AccountProfile = {
  displayName: string
  email: string
}

export function profileFromUser(user: User): AccountProfile {
  const metadata = user.user_metadata as Record<string, unknown>
  const name = [metadata.display_name, metadata.full_name, metadata.name, metadata.username]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
  const email = user.email ?? ''

  return {
    displayName: name?.trim() ?? email.split('@')[0] ?? 'Scribe user',
    email,
  }
}
