import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient.js'
import { getAuthenticatedUser, getDefaultStoreIdForUser, getStoreCountForUser, isSuperAdmin } from '../../../lib/auth-helpers.js'

export default async function DashboardPage({ searchParams }) {
  const { user } = await getAuthenticatedUser()

  if (!user?.id) {
    redirect('/login')
  }

  // Next.js 15 exposes searchParams as a Promise in server components.
  const resolvedSearchParams = await searchParams
  const storeId = typeof resolvedSearchParams?.storeId === 'string' ? resolvedSearchParams.storeId : ''
  const superAdmin = isSuperAdmin(user)
  const storeCount = await getStoreCountForUser(user, { linkedOnly: !superAdmin })

  // Super admins can access every store, so never force them into onboarding.
  // They land on the selected/default store, or the empty state when none exist.
  if (!superAdmin && storeCount === 0) {
    redirect('/onboarding')
  }

  if (!storeId) {
    const defaultStoreId = await getDefaultStoreIdForUser(user)

    if (defaultStoreId) {
      redirect(`/dashboard?storeId=${defaultStoreId}`)
    }
  }

  return <DashboardClient />
}
