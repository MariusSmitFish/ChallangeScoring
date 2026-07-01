export const SUPER_ADMIN_EMAIL = 'mariussmitb@gmail.com'

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
}
