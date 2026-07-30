// Rotas API: GETs públicos para listas e POSTs básicos para criar solicitacoes, registros_acesso e auditoria
const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Optional Supabase client (if SUPABASE_URL and SUPABASE_SECRET_KEY are provided)
let supabase = null;
try{
  const { createClient } = require('@supabase/supabase-js');
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if(SUPABASE_URL && SUPABASE_KEY){
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Supabase client initialized');
  }
}catch(e){
  // If package is not installed or something fails, proceed without supabase
  console.warn('Supabase client not available:', e.message);
}

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
    if(supabase){
      const { data, error } = await supabase.from('colaboradores').select('id,nome,matricula,cargo,departamento').limit(100);
      if(error) throw error;
      return res.json(data);
    }
    const rows = await tryQuery('SELECT id, nome, matricula, cargo, departamento FROM colaboradores LIMIT 100');
    return res.json(rows);
  }catch(e){
    console.warn('colaboradores handler error:', e.message);
    return res.json(sample.colaboradores);
  }
});

router.get('/departamentos', async (req,res)=>{
  try{
    if(supabase){
      const { data, error } = await supabase.from('departamentos').select('id,nome').limit(100);
      if(error) throw error;
      return res.json(data);
    }
    const rows = await tryQuery('SELECT id, nome FROM departamentos LIMIT 100');
    return res.json(rows);
  }catch(e){
    console.warn('departamentos handler error:', e.message);
    return res.json(sample.departamentos);
  }
});

router.get('/cargos', async (req,res)=>{
  try{
    if(supabase){
      const { data, error } = await supabase.from('cargos').select('id,nome').limit(100);
      if(error) throw error;
      return res.json(data);
    }
    const rows = await tryQuery('SELECT id, nome FROM cargos LIMIT 100');
    return res.json(rows);
  }catch(e){
    console.warn('cargos handler error:', e.message);
    return res.json(sample.cargos);
  }
});

router.get('/usuarios', async (req,res)=>{
  try{
    if(supabase){
      const { data, error } = await supabase.from('usuarios').select('id,nome,email,role').limit(100);
      if(error) throw error;
      return res.json(data);
    }
    const rows = await tryQuery('SELECT id, nome, email, role FROM usuarios LIMIT 100');
    return res.json(rows);
  }catch(e){
    console.warn('usuarios handler error:', e.message);
    return res.json(sample.usuarios);
  }
});

// GET solicitacoes
router.get('/solicitacoes', async (req,res)=>{
  try{
    if(supabase){
      const { data, error } = await supabase.from('solicitacoes').select('*').order('created_at', { ascending: false }).limit(200);
      if(error) throw error;
      return res.json(data);
    }
    const rows = await tryQuery('SELECT * FROM solicitacoes ORDER BY created_at DESC LIMIT 200');
    return res.json(rows);
  }catch(e){
    console.warn('solicitacoes handler error:', e.message);
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
    if(supabase){
      const payloadObj = {
        colaborador_id,
        colaborador_nome,
        departamento_id,
        departamento_nome,
        tipo,
        motivo: motivo || null,
        liberado_por,
        status: 'pendente',
        created_at: new Date().toISOString()
      };
      const { data, error } = await supabase.from('solicitacoes').insert([payloadObj]).select().single();
      if(error) throw error;
      // grava auditoria
      try{
        await supabase.from('auditoria').insert([{ usuario_id: liberado_por, acao: 'criar_solicitacao', payload: JSON.stringify(data), created_at: new Date().toISOString() }]);
      }catch(e){ console.warn('Não foi possível gravar auditoria no Supabase', e.message); }
      return res.json(data);
    }

    const insertSql = `INSERT INTO solicitacoes (colaborador_id, colaborador_nome, departamento_id, departamento_nome, tipo, motivo, liberado_por, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *`;
    const values = [colaborador_id, colaborador_nome, departamento_id, departamento_nome, tipo, motivo || null, liberado_por, 'pendente'];
    const rows = await tryQuery(insertSql, values);
    // grava auditoria
    try{ await tryQuery('INSERT INTO auditoria (usuario_id, acao, payload, created_at) VALUES ($1,$2,$3,NOW())', [liberado_por, 'criar_solicitacao', JSON.stringify(rows[0])]); }catch(e){console.warn('Não foi possível gravar auditoria no DB');}
    return res.json(rows[0]);
  }catch(err){
    // fallback para amostra local
    console.warn('post solicitacoes error:', err.message);
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
    if(supabase){
      const { data, error } = await supabase.from('registros_acesso').select('*').order('confirmado_em', { ascending: false }).limit(200);
      if(error) throw error;
      return res.json(data);
    }
    const rows = await tryQuery('SELECT * FROM registros_acesso ORDER BY confirmado_em DESC LIMIT 200');
    return res.json(rows);
  }catch(e){
    console.warn('registros_acesso handler error:', e.message);
    return res.json(sample.registros_acesso);
  }
});

// POST registros_acesso (Portaria confirma)
router.post('/registros_acesso', async (req,res)=>{
  const { solicitacao_id, portaria_usuario_id } = req.body;
  if(!solicitacao_id || !portaria_usuario_id) return res.status(400).json({ error: 'Campos obrigatórios' });
  try{
    if(supabase){
      const payloadObj = { solicitacao_id, portaria_usuario_id, confirmado_em: new Date().toISOString() };
      const { data, error } = await supabase.from('registros_acesso').insert([payloadObj]).select().single();
      if(error) throw error;
      // auditoria
      try{ await supabase.from('auditoria').insert([{ usuario_id: portaria_usuario_id, acao: 'confirmar_registro', payload: JSON.stringify(data), created_at: new Date().toISOString() }]); }catch(e){ console.warn('Não foi possível gravar auditoria no Supabase', e.message); }
      return res.json(data);
    }
    const rows = await tryQuery('INSERT INTO registros_acesso (solicitacao_id, portaria_usuario_id, confirmado_em) VALUES ($1,$2,NOW()) RETURNING *', [solicitacao_id, portaria_usuario_id]);
    // auditoria
    try{ await tryQuery('INSERT INTO auditoria (usuario_id, acao, payload, created_at) VALUES ($1,$2,$3,NOW())', [portaria_usuario_id, 'confirmar_registro', JSON.stringify(rows[0])]); }catch(e){}
    return res.json(rows[0]);
  }catch(e){
    console.warn('post registros_acesso error:', e.message);
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
    if(supabase){
      const { data, error } = await supabase.from('auditoria').insert([{ usuario_id, acao, payload: JSON.stringify(payload), created_at: new Date().toISOString() }]).select().single();
      if(error) throw error;
      return res.json(data);
    }
    const rows = await tryQuery('INSERT INTO auditoria (usuario_id, acao, payload, created_at) VALUES ($1,$2,$3,NOW()) RETURNING *', [usuario_id, acao, JSON.stringify(payload)]);
    return res.json(rows[0]);
  }catch(e){
    console.warn('auditoria handler error:', e.message);
    const obj = { id: Date.now(), usuario_id, acao, payload, created_at: new Date().toISOString() };
    sample.auditoria.unshift(obj);
    return res.json(obj);
  }
});

module.exports = router;