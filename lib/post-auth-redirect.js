export async function getPostAuthRedirectPath(sessionUser) {
  if (sessionUser?.role === 'SUPER_ADMIN') {
    return '/admin';
  }

  try {
    const res = await fetch('/api/stores?scope=linked', { cache: 'no-store' });
    const result = await res.json();

    if (!result.success || !Array.isArray(result.data)) {
      return '/dashboard';
    }

    if (result.data.length === 0) {
      return '/onboarding';
    }

    return result.data[0]?.id ? `/dashboard?storeId=${result.data[0].id}` : '/dashboard';
  } catch (error) {
    console.error(error);
    return '/dashboard';
  }
}
