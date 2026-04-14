async function adminRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  return { response, data };
}

function showAdminMessage(message, type) {
  const box = document.getElementById('statusMsg');
  if (!box) {
    return;
  }

  box.textContent = message;
  box.className = `status-msg ${type}`;
  box.style.display = 'block';
}

function renderStudents(students) {
  const tbody = document.getElementById('studentTableBody');
  const count = document.getElementById('studentCount');

  if (!tbody || !count) {
    return;
  }

  count.textContent = `${students.length} registered student${students.length === 1 ? '' : 's'}`;

  if (!students.length) {
    tbody.innerHTML = '<tr><td colspan="6">No students have registered yet.</td></tr>';
    return;
  }

  tbody.innerHTML = students
    .map(
      (student, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${student.name}</td>
          <td>${student.email}</td>
          <td>${student.regNo}</td>
          <td>${student.cgpa}</td>
          <td>${new Date(student.createdAt).toLocaleString()}</td>
        </tr>
      `
    )
    .join('');
}

async function loadStudents() {
  const { response, data } = await adminRequest('/api/admin/students', { method: 'GET', headers: {} });
  if (!response.ok) {
    window.location.href = '/admin-login.html';
    return;
  }

  renderStudents(data.students || []);
}

function setupAdminLogin() {
  const form = document.getElementById('adminLoginForm');
  if (!form) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;

    if (!email || !password) {
      showAdminMessage('Admin email and password are required.', 'error');
      return;
    }

    const { response, data } = await adminRequest('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      showAdminMessage(data?.message || 'Unable to login as admin.', 'error');
      return;
    }

    showAdminMessage(data.message || 'Admin login successful.', 'success');
    setTimeout(() => {
      window.location.href = '/admin.html';
    }, 1000);
  });
}

function setupAdminLogout() {
  const logoutButton = document.getElementById('adminLogout');
  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener('click', async (event) => {
    event.preventDefault();
    await adminRequest('/api/auth/logout', {
      method: 'POST',
      headers: {}
    });
    window.location.href = '/admin-login.html';
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const pathname = window.location.pathname.toLowerCase();

  if (pathname.endsWith('/admin-login.html')) {
    setupAdminLogin();
    return;
  }

  if (pathname.endsWith('/admin.html')) {
    setupAdminLogout();
    await loadStudents();
  }
});
