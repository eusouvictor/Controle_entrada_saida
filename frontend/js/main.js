function setActiveLink(pathname) {
  const links = document.querySelectorAll('nav a[href]');
  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (href && href.includes(pathname)) {
      link.classList.add('text-primary', 'font-bold', 'border-b-2', 'border-primary', 'pb-1');
      link.classList.remove('text-on-surface-variant');
    }
  });
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Erro na requisição');
  }

  return data;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
}

function initNavigation() {
  const pathname = window.location.pathname;
  if (pathname === '/' || pathname === '/Formulario.html') {
    setActiveLink('Formulario.html');
  } else if (pathname.includes('HistoricoAutorizacao.html')) {
    setActiveLink('HistoricoAutorizacao.html');
  } else if (pathname.includes('GestaoFuncionarios.html')) {
    setActiveLink('GestaoFuncionarios.html');
  } else if (pathname.includes('ConfiguracaoFuncionario.html')) {
    setActiveLink('ConfiguracaoFuncionario.html');
  }
}

function initAuthorizationForm() {
  const form = document.getElementById('authorizationForm');
  const preview = document.getElementById('preview-document');

  if (!form) return;

  const inputs = form.querySelectorAll('input, textarea');
  inputs.forEach((input) => {
    input.addEventListener('input', () => {
      const target = document.getElementById(input.id + '-preview');
      if (target) {
        target.textContent = input.value || '---';
      }
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      type: form.querySelector('input[name="auth_type"]:checked')?.value || 'entrada',
      employeeName: document.getElementById('employeeName')?.value || '',
      supervisorName: document.getElementById('supervisorName')?.value || '',
      departmentName: document.getElementById('departmentName')?.value || '',
      workSchedule: document.getElementById('workSchedule')?.value || '',
      authorizationDate: document.getElementById('authorizationDate')?.value || '',
      releaseTime: document.getElementById('releaseTime')?.value || '',
      releasedBy: document.getElementById('releasedBy')?.value || '',
      signature: document.getElementById('signature')?.value || '',
      reason: document.getElementById('reason')?.value || ''
    };

    try {
      await api('/api/authorizations', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const message = document.getElementById('formMessage');
      if (message) {
        message.textContent = 'Autorização enviada com sucesso!';
      }
      form.reset();
      if (preview) {
        preview.querySelectorAll('[data-preview-value]').forEach((node) => {
          node.textContent = '---';
        });
      }
    } catch (error) {
      const message = document.getElementById('formMessage');
      if (message) {
        message.textContent = error.message;
      }
    }
  });
}

async function renderDepartments() {
  const list = document.getElementById('department-list');
  if (!list) return;

  try {
    const departments = await api('/api/departments');
    list.innerHTML = departments.map((department) => `
      <div class="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border border-surface-variant">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-primary">${department.icon || 'domain'}</span>
          <span class="font-label-md text-label-md">${department.name}</span>
        </div>
      </div>
    `).join('');
  } catch (error) {
    list.innerHTML = `<p class="text-error">${error.message}</p>`;
  }
}

async function initDepartmentForm() {
  const form = document.getElementById('department-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('department-name').value.trim();
    if (!name) return;

    try {
      await api('/api/departments', {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      form.reset();
      await renderDepartments();
    } catch (error) {
      const message = document.getElementById('department-form-message');
      if (message) {
        message.textContent = error.message;
      }
    }
  });
}

async function renderSupervisors() {
  const list = document.getElementById('supervisor-list');
  if (!list) return;

  try {
    const supervisors = await api('/api/supervisors');
    list.innerHTML = supervisors.map((supervisor) => `
      <div class="p-4 border border-surface-variant rounded-xl flex items-center gap-4">
        <div class="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold">${supervisor.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
        <div>
          <p class="font-label-md text-label-md">${supervisor.name}</p>
          <p class="text-label-sm font-label-sm text-on-surface-variant">Depto: ${supervisor.department_name || 'Não informado'}</p>
        </div>
      </div>
    `).join('');
  } catch (error) {
    list.innerHTML = `<p class="text-error">${error.message}</p>`;
  }
}

async function initSupervisorForm() {
  const form = document.getElementById('supervisor-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('supervisor-name').value.trim();
    const departmentId = document.getElementById('supervisor-department').value;
    const email = document.getElementById('supervisor-email').value.trim();

    if (!name) return;

    try {
      await api('/api/supervisors', {
        method: 'POST',
        body: JSON.stringify({ name, departmentId, email })
      });
      form.reset();
      await renderSupervisors();
    } catch (error) {
      const message = document.getElementById('supervisor-form-message');
      if (message) {
        message.textContent = error.message;
      }
    }
  });
}

async function renderEmployees() {
  const list = document.getElementById('employee-list');
  if (!list) return;

  try {
    const employees = await api('/api/employees');
    list.innerHTML = employees.map((employee) => `
      <div class="bg-surface-container-lowest rounded-xl border border-surface-variant custom-shadow overflow-hidden">
        <div class="h-2 bg-primary"></div>
        <div class="p-6">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-16 h-16 rounded-full overflow-hidden border-2 border-surface-variant bg-surface-container-low flex items-center justify-center text-primary font-bold">${employee.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
            <div>
              <h3 class="font-headline-md text-headline-md text-on-surface">${employee.name}</h3>
              <span class="px-2 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed rounded-full text-[10px] font-bold uppercase tracking-wider">${employee.status || 'ativo'}</span>
            </div>
          </div>
          <div class="space-y-3 pt-4 border-t border-surface-variant/50">
            <div class="flex items-center justify-between">
              <span class="text-label-sm text-on-surface-variant uppercase tracking-tighter">Departamento</span>
              <span class="text-body-md font-medium text-on-surface">${employee.department_name || 'Não informado'}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-label-sm text-on-surface-variant uppercase tracking-tighter">Supervisor</span>
              <span class="text-body-md font-medium text-on-surface">${employee.supervisor_name || 'Não informado'}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-label-sm text-on-surface-variant uppercase tracking-tighter">CPF</span>
              <span class="text-body-md font-medium text-on-surface">${employee.cpf || '-'}</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    list.innerHTML = `<p class="text-error">${error.message}</p>`;
  }
}

async function renderAuthorizations() {
  const list = document.getElementById('authorization-list');
  if (!list) return;

  try {
    const authorizations = await api('/api/authorizations');
    list.innerHTML = authorizations.map((item) => `
      <tr class="table-row-hover transition-colors">
        <td class="px-6 py-4 font-body-md text-body-md">${formatDate(item.authorization_date || item.created_at)}</td>
        <td class="px-6 py-4 font-label-md text-label-md text-on-surface">${item.employee_name}</td>
        <td class="px-6 py-4">
          <span class="px-3 py-1 rounded-full ${item.type === 'saida' ? 'bg-secondary-fixed text-on-secondary-fixed-variant' : item.type === 'dia' ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'} font-label-sm text-label-sm">${item.type || 'entrada'}</span>
        </td>
        <td class="px-6 py-4 font-body-md text-body-md">${item.supervisor_name}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex justify-end gap-2">
            <button class="p-2 text-on-surface-variant hover:text-primary transition-colors" title="Visualizar">
              <span class="material-symbols-outlined">visibility</span>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    list.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-error">${error.message}</td></tr>`;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  initAuthorizationForm();
  await renderDepartments();
  initDepartmentForm();
  await renderSupervisors();
  initSupervisorForm();
  await renderEmployees();
  await renderAuthorizations();
});
