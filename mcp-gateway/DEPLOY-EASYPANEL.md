# 🚀 Deploy MCP Gateway no Easypanel

## 📋 Pré-requisitos

- Acesso ao Easypanel
- Repositório Git (GitHub/GitLab) ou upload manual
- VPS rodando

## 🎯 Método 1: Deploy via GitHub (Recomendado)

### Passo 1: Criar repositório Git

```bash
cd C:\Users\Wjcam\OneDrive\Documentos\GESTORCONECTA\n8n
git init
git add mcp-gateway/ mcp-camaleao-crm/
git commit -m "feat: MCP Gateway + MCP CRM"
```

### Passo 2: Push para GitHub

```bash
# Criar repo no GitHub primeiro
git remote add origin https://github.com/seu-usuario/camaleao-mcp.git
git branch -M main
git push -u origin main
```

### Passo 3: Configurar no Easypanel

1. Acesse Easypanel
2. Clique em **"+ Create"** → **"App"**
3. **Source:**
   - Type: **GitHub**
   - Repository: `seu-usuario/camaleao-mcp`
   - Branch: `main`
   - Build Path: `/mcp-gateway`

4. **Build Settings:**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Port: `3100`

5. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=3100
   CAMALEAO_API_URL=https://web-api.camaleaocamisas.com.br/graphql-api
   CAMALEAO_EMAIL=api-gerente@email.com
   CAMALEAO_PASSWORD=PPTDYBYqcmE7wg
   ```

6. **Domain:**
   - Adicione: `mcp.gestorconecta.com.br`
   - Habilitar HTTPS

7. **Deploy**

---

## 🎯 Método 2: Deploy via Dockerfile (Mais Simples)

### Passo 1: Preparar arquivos

Crie um repositório com esta estrutura:

```
camaleao-mcp/
├── Dockerfile
├── package.json
├── src/
│   └── index.ts
└── mcp-crm/              # MCP CRM integrado
    ├── src/
    └── package.json
```

### Passo 2: Dockerfile otimizado

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copiar tudo
COPY . .

# Instalar dependências do gateway
RUN cd /app && npm install && npm run build

# Instalar dependências do MCP CRM
RUN cd /app/../mcp-camaleao-crm && npm install && npm run build

EXPOSE 3100

CMD ["node", "build/index.js"]
```

### Passo 3: No Easypanel

1. **+ Create** → **App**
2. **Source:** GitHub (mesmo repositório)
3. **Build Type:** Dockerfile
4. **Port:** 3100
5. **Domain:** mcp.gestorconecta.com.br
6. **Deploy**

---

## 🎯 Método 3: Deploy Manual (Upload ZIP)

Se não quiser usar Git:

### Passo 1: Criar ZIP

1. Compacte as pastas:
   - `mcp-gateway/`
   - `mcp-camaleao-crm/`

2. Crie um `Dockerfile` na raiz

### Passo 2: Upload no Easypanel

1. **+ Create** → **App**
2. **Source:** Upload ZIP
3. Configure port e domínio
4. Deploy

---

## ✅ Verificar Deploy

Após deploy:

1. **Acesse:** https://mcp.gestorconecta.com.br
2. **Você verá:** Dashboard visual com todos os MCPs
3. **Teste health:** https://mcp.gestorconecta.com.br/health
4. **Liste MCPs:** https://mcp.gestorconecta.com.br/mcp/list

---

## 🔗 Integrar com n8n

Agora que o Gateway está na VPS, no n8n:

### Criar workflow de teste

1. **HTTP Request Node:**
   - Method: `POST`
   - URL: `https://mcp.gestorconecta.com.br/mcp/crm/espelho_bancario`
   - Headers: `Content-Type: application/json`
   - Body:
   ```json
   {
     "periodo": "hoje"
   }
   ```

2. **Executar** e ver resultado

---

## 🔐 Segurança

### Adicionar autenticação (opcional)

Edite `src/index.ts`:

```typescript
// Middleware de autenticação
const API_KEY = process.env.API_KEY || 'seu-token-seguro';

app.use((req, res, next) => {
  const key = req.headers['x-api-key'];

  // Permitir acesso público ao dashboard
  if (req.path === '/' || req.path === '/health') {
    return next();
  }

  // Exigir API key para tools
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
});
```

No n8n, adicione header:
```
X-API-Key: seu-token-seguro
```

---

## 📊 Monitoramento

### Logs no Easypanel

1. Vá no app **MCP Gateway**
2. **Logs** → Ver logs em tempo real
3. Procure por:
   - `[GATEWAY] Executando...`
   - `[ESPELHO] Período:...`
   - Erros (se houver)

### Health Check

Configure um monitor externo (UptimeRobot, etc):
- URL: `https://mcp.gestorconecta.com.br/health`
- Intervalo: 5 minutos
- Alerta se ficar offline

---

## 🐛 Troubleshooting

### Erro: "Cannot find module"

**Causa:** MCP CRM não foi copiado corretamente

**Solução:**
```dockerfile
# No Dockerfile, garantir que copia tudo
COPY ../mcp-camaleao-crm /mcp-camaleao-crm
```

### Erro: "Port 3100 already in use"

**Causa:** Porta ocupada

**Solução:** No Easypanel, use porta diferente (3101, 3102, etc)

### Gateway não aparece no n8n

**Normal!** O Gateway **não** aparece como MCP Access do n8n.

**Como usar:**
- Use **HTTP Request** node no n8n
- Chame: `POST https://mcp.gestorconecta.com.br/mcp/crm/espelho_bancario`

---

## 🎊 Próximos Passos

Após deploy bem-sucedido:

1. ✅ Testar todas as tools
2. ✅ Integrar no workflow do n8n
3. ➡️ Implementar tools restantes
4. ➡️ Criar MCP WhatsApp

---

## 📞 Suporte

Se tiver problemas:
- Veja logs no Easypanel
- Teste localmente primeiro (`npm run dev`)
- Verifique variáveis de ambiente

---

**Versão:** 1.0.0
**Última atualização:** 16/12/2025
**Status:** Pronto para deploy
