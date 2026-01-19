// Auth check for level pages - now allows anonymous play
export async function checkAuthAndRedirect() {
  try {
    const response = await fetch('/api/check-auth');
    const data = await response.json();

    if (!data.authenticated) {
      console.log('Playing anonymously - no authentication found');
      // Allow anonymous play - no redirect
      return true;
    }

    console.log('Authenticated user:', data.username);
    return true;
  } catch (error) {
    console.error('Auth check error:', error);
    // Still allow play on error
    return true;
  }
}

// Run check on page load (but don't block)
checkAuthAndRedirect();
