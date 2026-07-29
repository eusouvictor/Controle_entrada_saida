// Frontend logic: consome API em /api/* ou usa fallback local se não houver backend
const API_BASE = '/api';

// Elementos
const colaboradorSelect = document.getElementById('colaboradorSelect');
const departamentoSelect = document.getElementById('departamentoSelect');
const supervisorSelect = document.getElementById('supervisorSelect');
const matriculaField = document.getElementById('matriculaField');
const cargoField = document.getElementById('cargoField');
const tipoSelect = document.getElementById('tipoSelect');
const motivoField = document.getElementById('motivoField');
const solicitacaoAt = document.getElementById('solicitacaoAt');
const saveBtn = document.getElementById('saveRequest');
const resetBtn = document.getElementById('resetForm');
const requestsTable = document.querySelector('#requestsTable tbody');
const accessTable = document.querySelector('#accessTable tbody');
const currentUserName = document.getElementById('currentUserName');
const currentUserRole = document.getElementById('currentUserRole');

// Fallback sample data (usado se o backend não responder)
const fallback = {
  usuarios: [{ id: 1, nome: 'Victor Demo', email: 'victor@demo.com', role: 'Supervisor' }],
  colaboradores: [
    { id: 1, nome: 'Ana Souza', matricula: 'A001', cargo: 'Operadora', departamento: 'Expedição' },
    { id: 2, nome: 'Carlos Lima', matricula: 'A002', cargo: 'Almoxarife', departamento: 'Almoxarifado' }
  ],
  departamentos: [ { id: 1, nome: 'Expedição' }, { id: 2, nome: 'Almoxarifado' } ],
  cargos: [ { id: 1, nome: 'Operadora' }, { id: 2, nome: 'Almoxarife' } ],
  solicitacoes: [],
  registros_acesso: [],
  auditoria: []
};

async function fetchOrFallback(path, fallbackData){
  try{
    const res = await fetch(API_BASE + path);
    if(!res.ok) throw new Error('no api');
    return await res.json();
  }catch(e){
    console.warn('API indisponível, usando fallback para', path);
    return fallbackData;
  }
}

async function postOrFallback(path, payload){
  try{
    const res = await fetch(API_BASE + path, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!res.ok) throw new Error('post failed');
    return await res.json();
  }catch(e){
    console.warn('POST falhou, fallback local para', path);
    if(path === '/solicitacoes'){
      const id = Date.now();
      const obj = Object.assign({ id, status: 'pendente', created_at: new Date().toISOString() }, payload);
      fallback.solicitacoes.unshift(obj);
      writeAudit({ usuario_id: payload.liberado_por, acao: 'criar_solicitacao', payload: obj });
      return obj;
    }
    return null;
  }
}

function optionEl(val, text){const o=document.createElement('option');o.value=val;o.textContent=text;return o}

async function loadInitialData(){
  const usuarios = await fetchOrFallback('/usuarios', fallback.usuarios);
  const usuariosArr = Array.isArray(usuarios) ? usuarios : fallback.usuarios;
  const current = usuariosArr[0];
  currentUserName.textContent = current ? current.nome : 'n/a';
  currentUserRole.textContent = current ? current.role : '';

  const colaboradores = await fetchOrFallback('/colaboradores', fallback.colaboradores);
  const departamentos = await fetchOrFallback('/departamentos', fallback.departamentos);
  const cargos = await fetchOrFallback('/cargos', fallback.cargos);

  // popula selects
  colaboradores.forEach(c => colaboradorSelect.appendChild(optionEl(c.id, c.nome)));
  departamentos.forEach(d => departamentoSelect.appendChild(optionEl(d.id || d.nome, d.nome)));
  colaboradores.filter(c => c.role !== 'Supervisor');

  // supervisors (filtra por role no backend quando houver)
  // fallback: usar todos os usuarios como supervisores se houver apenas um
  const supervisors = usuariosArr;
  supervisors.forEach(s => supervisorSelect.appendChild(optionEl(s.id, s.nome)));

  // atualizar hora do registro (servidor deve sobrescrever na criação)
  solicitacaoAt.value = new Date().toLocaleString();

  // escutar mudança de colaborador para autopreencher matrícula/cargo
  colaboradorSelect.addEventListener('change', () => {
    const id = Number(colaboradorSelect.value);
    const selected = colaboradores.find(x => Number(x.id) === id) || colaboradores.find(x => x.id === id) || {};
    matriculaField.value = selected.matricula || '';
    cargoField.value = selected.cargo || '';
  });

  // carregar tabelas
  refreshTables();
}

async function refreshTables(){
  const solicitacoes = await fetchOrFallback('/solicitacoes', fallback.solicitacoes);
  const registros = await fetchOrFallback('/registros_acesso', fallback.registros_acesso);

  requestsTable.innerHTML = '';
  (solicitacoes || []).forEach((s, idx) =>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${idx+1}</td><td>${s.colaborador_nome || s.colaborador}</td><td>${s.departamento_nome || s.departamento}</td><td>${s.tipo}</td><td>${s.status||'pendente'}</td><td>${new Date(s.created_at || s.enviado_em || Date.now()).toLocaleString()}</td>`;
    requestsTable.appendChild(tr);
  });

  accessTable.innerHTML = '';
  (registros || []).forEach((r, idx)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${idx+1}</td><td>${r.solicitacao_id || r.solicitacao}</td><td>${r.portaria || 'Portaria'}</td><td>${new Date(r.confirmado_em || Date.now()).toLocaleString()}</td>`;
    accessTable.appendChild(tr);
  });
}

async function writeAudit(entry){
  try{
    await postOrFallback('/auditoria', entry);
  }catch(e){console.warn('auditoria fallback',e)}
}

saveBtn.addEventListener('click', async ()=>{
  // validação mínima no cliente; regras críticas no servidor
  if(!colaboradorSelect.value || !departamentoSelect.value || !tipoSelect.value || !supervisorSelect.value){
    alert('Preencha todos os campos obrigatórios.');
    return;
  }
  // construir payload
  const payload = {
    colaborador_id: Number(colaboradorSelect.value),
    colaborador_nome: colaboradorSelect.options[colaboradorSelect.selectedIndex].text,
    departamento_id: departamentoSelect.value,
    departamento_nome: departamentoSelect.options[departamentoSelect.selectedIndex].text,
    tipo: tipoSelect.value,
    motivo: motivoField.value,
    liberado_por: Number(supervisorSelect.value)
  };

  // Regra de retroatividade deve ser validada no servidor (ex.: não permitir datas no passado sem justificativa)
  const created = await postOrFallback('/solicitacoes', payload);
  if(created){
    await writeAudit({usuario_id: payload.liberado_por, acao:'emitir_solicitacao', payload:created});
    alert('Solicitação registrada (timestamp será garantido pelo servidor).');
    // atualizar UI
    motivoField.value = '';
    tipoSelect.value = '';
    solicitacaoAt.value = new Date().toLocaleString();
    refreshTables();
  }
});

resetBtn.addEventListener('click', ()=>{
  document.getElementById('requestForm').reset();
  matriculaField.value = '';
  cargoField.value = '';
  solicitacaoAt.value = new Date().toLocaleString();
});

// inicializa
loadInitialData();

// For debugging: expose fallback
window.__FALLBACK = fallback;