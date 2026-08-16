// server.js - API mínima para o sistema de autorização
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();
const apiRoutes = require('./routes/api');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Servir frontend estático (opcional): se a pasta frontend existir, servir arquivos
const path = require('path');
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// prefixo /api
app.use('/api', apiRoutes);

// fallback para SPA
app.get('*', (req,res)=>{
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, ()=>{
  console.log(`Server running on port ${port} - API base /api`);
});