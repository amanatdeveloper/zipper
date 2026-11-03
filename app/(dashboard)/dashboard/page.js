import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient.js'
import { getAuthenticatedUser, getDefaultStoreIdForUser, getStoreCountForUser } from '../../../lib/auth-helpers.js'

export default async function DashboardPage({ searchParams }) {
  const { user } = await getAuthenticatedUser()

  if (!user?.id) {
    redirect('/login')
  }

  // Next.js 15 exposes searchParams as a Promise in server components.
  const resolvedSearchParams = await searchParams
  const storeId = typeof resolvedSearchParams?.storeId === 'string' ? resolvedSearchParams.storeId : ''
  const storeCount = await getStoreCountForUser(user, { linkedOnly: true })

  if (storeCount === 0) {
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
