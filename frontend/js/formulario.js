// Interaction script extracted from Formulario.html
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('mousedown', () => {
        button.classList.add('scale-95');
    });
    button.addEventListener('mouseup', () => {
        button.classList.remove('scale-95');
    });
    button.addEventListener('mouseleave', () => {
        button.classList.remove('scale-95');
    });
});

// Toggle radio background for visual feedback
const radios = document.querySelectorAll('input[name="auth_type"]');
radios.forEach(radio => {
    radio.addEventListener('change', () => {
        const parent = radio.closest('div');
        parent.querySelectorAll('label').forEach(label => {
            label.classList.remove('text-primary');
            label.classList.add('text-on-surface-variant');
        });
        if (radio.checked) {
            radio.nextElementSibling.classList.add('text-primary');
            radio.nextElementSibling.classList.remove('text-on-surface-variant');
        }
    });
});

// Geração do documento imprimível: ao submeter o formulário, abrir nova janela com template preenchido
const form = document.getElementById('authorizationForm');
if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        // coletar valores do formulário
        const tipo = document.querySelector('input[name="auth_type"]:checked') ? document.querySelector('input[name="auth_type"]:checked').value : '';
        const nome = document.getElementById('employeeName') ? document.getElementById('employeeName').value : '';
        const supervisor = document.getElementById('supervisorName') ? document.getElementById('supervisorName').value : '';
        const departamento = document.getElementById('departmentName') ? document.getElementById('departmentName').value : '';
        const horario = document.getElementById('workSchedule') ? document.getElementById('workSchedule').value : '';
        const data = document.getElementById('authorizationDate') ? document.getElementById('authorizationDate').value : '';
        const horarioLib = document.getElementById('releaseTime') ? document.getElementById('releaseTime').value : '';
        const liberadoPor = document.getElementById('releasedBy') ? document.getElementById('releasedBy').value : '';
        const assinatura = document.getElementById('signature') ? document.getElementById('signature').value : '';
        const motivo = document.getElementById('reason') ? document.getElementById('reason').value : '';

        // montar HTML do documento imprimível (usa o css/formulario.css para estilos básicos)
        const printHtml = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Autorização - ${nome}</title>
<link rel="stylesheet" href="css/formulario.css">
<style>
  body{font-family:Inter,Arial,Helvetica,sans-serif;color:#0b1c30;background:white;padding:24px}
  .doc{max-width:800px;margin:0 auto}
  .header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd;padding-bottom:8px;margin-bottom:12px}
  .title{text-align:center}
  .fields{font-size:14px}
  .field{display:flex;gap:8px;margin-bottom:8px}
  .field strong{width:160px}
  .reason{min-height:80px;border:1px solid #ddd;padding:8px}
  @media print{ button{display:none} }
</style>
</head>
<body>
  <div class="doc">
    <div class="header">
      <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkVGiXnG3oaTX_RtE6sgMsQVv47Qk91qJjZc98bGinixWiFv6ugvFz_k62Rk780IOEGIznd_3f7NFkBPDJjsRGCJbUXlOR2DfNpaCHiXi3_A4cNiQsUmP3Q-biV9CkO7lrwnmoAdzc3Fqn5ksMD_g_z_cA47J6211qU3hzldMsrVZDkYRl044ScLurscElM-tJMv29L6Wv5rePl0MpQhd78lFBKC_OowBKHAISI6nN-rPK9aedupI-NXrU98zCPIexuA" alt="Logo" style="height:48px">
      <div class="title">
        <h2>Autorização de Saída/Entrada</h2>
        <div style="font-size:12px;color:#666">${tipo ? tipo.toUpperCase() : ''}</div>
      </div>
      <div style="width:120px;text-align:right;font-size:12px;color:#666">Documento imprimível</div>
    </div>

    <div class="fields">
      <div class="field"><strong>Nome:</strong><div>${escapeHtml(nome)}</div></div>
      <div class="field"><strong>Supervisor:</strong><div>${escapeHtml(supervisor)}</div></div>
      <div class="field"><strong>Departamento:</strong><div>${escapeHtml(departamento)}</div></div>
      <div class="field"><strong>Horário de Trabalho:</strong><div>${escapeHtml(horario)}</div></div>
      <div style="height:12px"></div>
      <div class="field"><strong>Data:</strong><div>${escapeHtml(data)}</div></div>
      <div class="field"><strong>Horário de liberação:</strong><div>${escapeHtml(horarioLib)}</div></div>
      <div class="field"><strong>Liberado por:</strong><div>${escapeHtml(liberadoPor)}</div></div>
      <div class="field"><strong>Assinatura:</strong><div>${escapeHtml(assinatura)}</div></div>
      <div class="field"><strong>Motivo:</strong><div class="reason">${escapeHtml(motivo)}</div></div>
    </div>

    <div style="margin-top:20px;font-size:12px;color:#666;display:flex;justify-content:space-between">
      <div>Portaria</div>
      <div>RH</div>
    </div>

    <div style="margin-top:18px;text-align:right"><button onclick="window.print()">Imprimir</button></div>
  </div>
</body>
</html>`;

        // abrir nova janela e escrever o documento
        const w = window.open('', '_blank');
        if (!w) {
            alert('Pop-up bloqueado. Permita pop-ups para gerar a impressão.');
            return;
        }
        w.document.open();
        w.document.write(printHtml);
        w.document.close();
        // dar foco e chamar impressão
        w.focus();
        // garantir pequeno delay para carregar recursos
        setTimeout(() => w.print(), 300);
    });
}

// utilidade: escapar HTML simples para evitar injeção de markup
function escapeHtml(str){
    if(!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}