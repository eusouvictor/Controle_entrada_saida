// Rotas API: GETs públicos para listas e POSTs básicos para criar solicitacoes, registros_acesso e auditoria
const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Dados de fallback para desenvolvimento sem banco configurado
const sample = {
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

// Helper: tenta executar query no Postgres, lança erro se falhar
async function tryQuery(sql, params){
  try{
    const res = await db.query(sql, params);
    return res.rows;
  }catch(err){
    console.warn('DB query falhou:', err.message);
    throw err;
  }
}

// GET /api/colaboradores
router.get('/colaboradores', async (req,res)=>{
  try{
    const rows = await tryQuery('SELECT id, nome, matricula, cargo, departamento FROM colaboradores LIMIT 100');
    return res.json(rows);
  }catch(e){
    return res.json(sample.colaboradores);
  }
});

router.get('/departamentos', async (req,res)=>{
  try{
    const rows = await tryQuery('SELECT id, nome FROM departamentos LIMIT 100');
    return res.json(rows);
  }catch(e){
    return res.json(sample.departamentos);
  }
});

router.get('/cargos', async (req,res)=>{
  try{
    const rows = await tryQuery('SELECT id, nome FROM cargos LIMIT 100');
    return res.json(rows);
  }catch(e){
    return res.json(sample.cargos);
  }
});

router.get('/usuarios', async (req,res)=>{
  try{
    const rows = await tryQuery('SELECT id, nome, email, role FROM usuarios LIMIT 100');
    return res.json(rows);
  }catch(e){
    return res.json(sample.usuarios);
  }
});

// GET solicitacoes
router.get('/solicitacoes', async (req,res)=>{
  try{
    const rows = await tryQuery('SELECT * FROM solicitacoes ORDER BY created_at DESC LIMIT 200');
    return res.json(rows);
  }catch(e){
    return res.json(sample.solicitacoes);
  }
});

// POST solicitacoes -> insere registro com timestamp do servidor e gera auditoria
router.post('/solicitacoes', async (req,res)=>{
  const { colaborador_id, colaborador_nome, departamento_id, departamento_nome, tipo, motivo, liberado_por } = req.body;
  if(!colaborador_id || !departamento_id || !tipo || !liberado_por){
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }

  // Regra crítica: validação de retroatividade deve ocorrer aqui (exemplo simples: bloquear dates passadas)
  try{
    const insertSql = `INSERT INTO solicitacoes (colaborador_id, colaborador_nome, departamento_id, departamento_nome, tipo, motivo, liberado_por, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *`;
    const values = [colaborador_id, colaborador_nome, departamento_id, departamento_nome, tipo, motivo || null, liberado_por, 'pendente'];
    const rows = await tryQuery(insertSql, values);
    // grava auditoria
    try{ await tryQuery('INSERT INTO auditoria (usuario_id, acao, payload, created_at) VALUES ($1,$2,$3,NOW())', [liberado_por, 'criar_solicitacao', JSON.stringify(rows[0])]); }catch(e){console.warn('Não foi possível gravar auditoria no DB');}
    return res.json(rows[0]);
  }catch(err){
    // fallback para amostra local
    const id = Date.now();
    const obj = { id, colaborador_id, colaborador_nome, departamento_id, departamento_nome, tipo, motivo, liberado_por, status: 'pendente', created_at: new Date().toISOString() };
    sample.solicitacoes.unshift(obj);
    sample.auditoria.unshift({ usuario_id: liberado_por, acao: 'criar_solicitacao', payload: obj, created_at: new Date().toISOString() });
    return res.json(obj);
  }
});

// GET registros_acesso
router.get('/registros_acesso', async (req,res)=>{
  try{
    const rows = await tryQuery('SELECT * FROM registros_acesso ORDER BY confirmado_em DESC LIMIT 200');
    return res.json(rows);
  }catch(e){
    return res.json(sample.registros_acesso);
  }
});

// POST registros_acesso (Portaria confirma)
router.post('/registros_acesso', async (req,res)=>{
  const { solicitacao_id, portaria_usuario_id } = req.body;
  if(!solicitacao_id || !portaria_usuario_id) return res.status(400).json({ error: 'Campos obrigatórios' });
  try{
    const rows = await tryQuery('INSERT INTO registros_acesso (solicitacao_id, portaria_usuario_id, confirmado_em) VALUES ($1,$2,NOW()) RETURNING *', [solicitacao_id, portaria_usuario_id]);
    // auditoria
    try{ await tryQuery('INSERT INTO auditoria (usuario_id, acao, payload, created_at) VALUES ($1,$2,$3,NOW())', [portaria_usuario_id, 'confirmar_registro', JSON.stringify(rows[0])]); }catch(e){}
    return res.json(rows[0]);
  }catch(e){
    const obj = { id: Date.now(), solicitacao_id, portaria_usuario_id, confirmado_em: new Date().toISOString() };
    sample.registros_acesso.unshift(obj);
    sample.auditoria.unshift({ usuario_id: portaria_usuario_id, acao: 'confirmar_registro', payload: obj, created_at: new Date().toISOString() });
    return res.json(obj);
  }
});

// POST auditoria (geral)
router.post('/auditoria', async (req,res)=>{
  const { usuario_id, acao, payload } = req.body;
  try{
    const rows = await tryQuery('INSERT INTO auditoria (usuario_id, acao, payload, created_at) VALUES ($1,$2,$3,NOW()) RETURNING *', [usuario_id, acao, JSON.stringify(payload)]);
    return res.json(rows[0]);
  }catch(e){
    const obj = { id: Date.now(), usuario_id, acao, payload, created_at: new Date().toISOString() };
    sample.auditoria.unshift(obj);
    return res.json(obj);
  }
});

module.exports = router;