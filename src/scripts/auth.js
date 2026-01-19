// Authentication module
let currentUser = null;

// Check authentication status on page load
export async function checkAuth() {
  try {
    const response = await fetch('/api/check-auth');
    const data = await response.json();
    
    if (data.authenticated) {
      currentUser = data.username;
      updateAuthUI(true);
      return true;
    } else {
      updateAuthUI(false);
      return false;
    }
  } catch (error) {
    console.error('Auth check error:', error);
    updateAuthUI(false);
    return false;
  }
}

// Update UI based on authentication status
function updateAuthUI(isAuthenticated) {
  const authBtn = document.getElementById('auth-btn');
  const logoutBtn = document.getElementById('logout-btn');

  if (isAuthenticated) {
    authBtn.classList.add('d-none');
    logoutBtn.classList.remove('d-none');
    logoutBtn.title = `Logout (${currentUser})`;
  } else {
    authBtn.classList.remove('d-none');
    logoutBtn.classList.add('d-none');
  }

  // Trigger auth status change event for other modules
  window.dispatchEvent(new CustomEvent('authStatusChanged', {
    detail: { authenticated: isAuthenticated, username: currentUser }
  }));
}

// Get current user
export function getCurrentUser() {
  return currentUser;
}

// Is user authenticated
export function isAuthenticated() {
  return currentUser !== null;
}

// Initialize auth functionality
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showRegisterBtn = document.getElementById('show-register');
  const showLoginBtn = document.getElementById('show-login');
  const logoutBtn = document.getElementById('logout-btn');
  const authModalLabel = document.getElementById('authModalLabel');
  const authModal = document.getElementById('authModal');
  
  // Toggle between login and register forms
  showRegisterBtn?.addEventListener('click', () => {
    loginForm.classList.add('d-none');
    registerForm.classList.remove('d-none');
    authModalLabel.textContent = 'Registrieren';
    clearErrors();
  });
  
  showLoginBtn?.addEventListener('click', () => {
    registerForm.classList.add('d-none');
    loginForm.classList.remove('d-none');
    authModalLabel.textContent = 'Login';
    clearErrors();
  });
  
  // Handle login
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!loginForm.checkValidity()) {
      loginForm.classList.add('was-validated');
      return;
    }
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        currentUser = data.username;
        updateAuthUI(true);
        bootstrap.Modal.getInstance(authModal).hide();
        loginForm.reset();
        loginForm.classList.remove('was-validated');
        clearErrors();
      } else {
        showError('login-error', data.error);
      }
    } catch (error) {
      showError('login-error', 'Verbindungsfehler. Bitte versuchen Sie es erneut.');
    }
  });
  
  // Handle register
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;
    
    if (password !== passwordConfirm) {
      showError('register-error', 'Passwörter stimmen nicht überein');
      return;
    }
    
    if (!registerForm.checkValidity()) {
      registerForm.classList.add('was-validated');
      return;
    }
    
    const username = document.getElementById('register-username').value;
    
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, passwordConfirm })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        currentUser = data.username;
        updateAuthUI(true);
        bootstrap.Modal.getInstance(authModal).hide();
        registerForm.reset();
        registerForm.classList.remove('was-validated');
        clearErrors();
      } else {
        showError('register-error', data.error);
      }
    } catch (error) {
      showError('register-error', 'Verbindungsfehler. Bitte versuchen Sie es erneut.');
    }
  });
  
  // Handle logout
  logoutBtn?.addEventListener('click', async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      currentUser = null;
      updateAuthUI(false);
      // Optionally reload page or redirect
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  });
  
  // Reset forms when modal is closed
  authModal?.addEventListener('hidden.bs.modal', () => {
    loginForm.reset();
    registerForm.reset();
    loginForm.classList.remove('was-validated');
    registerForm.classList.remove('was-validated');
    registerForm.classList.add('d-none');
    loginForm.classList.remove('d-none');
    authModalLabel.textContent = 'Login';
    clearErrors();
  });
});

function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  errorElement.textContent = message;
  errorElement.classList.remove('d-none');
}

function clearErrors() {
  document.getElementById('login-error')?.classList.add('d-none');
  document.getElementById('register-error')?.classList.add('d-none');
}
