const protectedPages = new Set(['/companies.html', '/resources.html', '/roadmaps.html']);

async function getSession() {
  const response = await fetch('/api/auth/session', {
    credentials: 'same-origin'
  });

  if (!response.ok) {
    return { authenticated: false };
  }

  return response.json();
}

function updateAuthNav(isAuthenticated) {
  const authSection = document.getElementById('nav-auth');
  if (!authSection) {
    return;
  }

  const session = window.currentSession || { user: null };
  const isAdmin = session.user?.role === 'admin';

  authSection.innerHTML = isAuthenticated
    ? `
        ${isAdmin ? '<li><a href="admin.html" class="btn-auth btn-login">Admin Panel</a></li>' : ''}
        <li><a href="#" id="logoutLink" class="btn-auth btn-login">Logout</a></li>
      `
    : `
        <li><a href="login.html" class="btn-auth btn-login">Login</a></li>
        <li><a href="register.html" class="btn-auth btn-register">Register</a></li>
      `;

  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', async (event) => {
      event.preventDefault();
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin'
      });
      window.location.href = '/index.html';
    });
  }
}

function showMessage(element, message, type) {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.className = `status-msg ${type}`;
  element.style.display = 'block';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateLogin(email, password) {
  if (!isValidEmail(email)) {
    return 'Enter a valid email address.';
  }

  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters.';
  }

  return '';
}

function validateRegistration(values) {
  if (!values.name.trim()) {
    return 'Full name is required.';
  }

  if (!isValidEmail(values.email)) {
    return 'Enter a valid college email address.';
  }

  if (!values.regNo.trim()) {
    return 'Registration number is required.';
  }

  const cgpa = Number(values.cgpa);
  if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) {
    return 'CGPA must be between 0 and 10.';
  }

  if (!values.password || values.password.length < 6) {
    return 'Password must be at least 6 characters.';
  }

  return '';
}

function setupPasswordToggle(toggleSelector, inputSelector) {
  const toggleButton = document.querySelector(toggleSelector);
  const passwordInput = document.querySelector(inputSelector);

  if (!toggleButton || !passwordInput) {
    return;
  }

  toggleButton.addEventListener('click', () => {
    const nextType = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', nextType);
    toggleButton.classList.toggle('fa-eye');
    toggleButton.classList.toggle('fa-eye-slash');
  });
}

function setupLogin() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) {
    return;
  }

  const msgBox = document.getElementById('statusMsg');
  setupPasswordToggle('#togglePassword', '#loginPass');

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value;
    const validationError = validateLogin(email, password);

    if (validationError) {
      showMessage(msgBox, validationError, 'error');
      return;
    }

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(msgBox, data.message || 'Unable to login.', 'error');
      return;
    }

    showMessage(msgBox, data.message || 'Login successful. Redirecting...', 'success');
    setTimeout(() => {
      window.location.href = '/index.html';
    }, 1200);
  });
}

function setupRegister() {
  const regForm = document.getElementById('regForm');
  if (!regForm) {
    return;
  }

  const msgBox = document.getElementById('statusMsg');
  setupPasswordToggle('#toggleRegPassword', '#pass');

  regForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formValues = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      regNo: document.getElementById('regNo').value.trim(),
      cgpa: document.getElementById('cgpa').value,
      password: document.getElementById('pass').value
    };
    const validationError = validateRegistration(formValues);

    if (validationError) {
      showMessage(msgBox, validationError, 'error');
      return;
    }

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify(formValues)
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(msgBox, data.message || 'Unable to create account.', 'error');
      return;
    }

    showMessage(msgBox, 'Account created. Redirecting to home...', 'success');
    setTimeout(() => {
      window.location.href = '/index.html';
    }, 1200);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const pathname = window.location.pathname.toLowerCase();
  const session = await getSession();
  window.currentSession = session;
  const isAuthenticated = Boolean(session.authenticated);

  if (protectedPages.has(pathname) && !isAuthenticated) {
    window.location.href = '/login.html';
    return;
  }

  if ((pathname.endsWith('/login.html') || pathname.endsWith('/register.html')) && isAuthenticated) {
    window.location.href = session.user?.role === 'admin' ? '/admin.html' : '/index.html';
    return;
  }

  updateAuthNav(isAuthenticated);
  setupLogin();
  setupRegister();
});
