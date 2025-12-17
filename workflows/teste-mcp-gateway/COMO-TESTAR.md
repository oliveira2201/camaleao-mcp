# 🧪 Como Testar MCP Gateway no n8n

## ✅ Pré-requisitos

1. Gateway rodando localmente: `npm run dev` na pasta `mcp-gateway`
2. Veja se está online: http://localhost:3100
3. n8n rodando

---

## 🎯 Método 1: Importar Workflow Pronto (Mais Rápido)

### Passo 1: Importar o workflow

1. Abra o n8n
2. Clique em **"+"** (Novo Workflow)
3. Menu **"⋮"** (três pontos) → **"Import from File"**
4. Selecione: `Workflow MCP Gateway - Teste.json`
5. Workflow será importado

### Passo 2: Executar testes

O workflow tem 5 testes:

1. **❤️ Health Check** - Verifica se Gateway está online
2. **🔍 Teste: Hoje** - Espelho bancário de hoje
3. **🔍 Teste: Esta Semana** - Espelho bancário da semana
4. **🔍 Teste: Novembro** - Espelho bancário de novembro
5. **📋 Listar MCPs** - Lista todos os MCPs disponíveis

**Executar:**
- Clique em **"Execute Workflow"**
- Todos os 5 testes rodam em paralelo
- Veja os resultados de cada um

### Passo 3: Verificar resultados

**Health Check deve retornar:**
```json
{
  "status": "online",
  "timestamp": "2025-12-16T...",
  "uptime": 123.45,
  "version": "1.0.0"
}
```

**Teste Hoje deve retornar:**
```json
{
  "success": true,
  "data": {
    "periodo_label": "hoje",
    "mensagem": "📊 Recebimentos de hoje:\n\nCora - R$ 1.110,00\n\nTotal = R$ 1.110,00",
    "total_recebido": 1110,
    "saldo_periodo": 291.10,
    "recebimentos_por_via": [...]
  }
}
```

---

## 🎯 Método 2: Criar Workflow Manualmente

### Passo 1: Criar novo workflow

1. **"+"** (Novo Workflow)
2. Nome: "Teste MCP Gateway"

### Passo 2: Adicionar Manual Trigger

1. **Add node** → **Manual Trigger**
2. Posicione no canvas

### Passo 3: Adicionar HTTP Request

1. **Add node** → **HTTP Request**
2. Configurar:
   - **Method:** POST
   - **URL:** `http://localhost:3100/mcp/crm/espelho_bancario`
   - **Authentication:** None
   - **Send Headers:** ✅
     - Header: `Content-Type`
     - Value: `application/json`
   - **Send Body:** ✅
   - **Body Content Type:** JSON
   - **JSON:**
   ```json
   {
     "periodo": "hoje"
   }
   ```

3. Conectar: **Manual Trigger** → **HTTP Request**

### Passo 4: Executar

1. Clique em **"Execute Workflow"**
2. Veja resultado no HTTP Request node
3. Deve aparecer dados do espelho bancário

---

## 🎯 Método 3: Usar no Agente (Produção)

Após testar que funciona, integre no agente:

### Workflow do Agente Camaleão

1. Abra workflow **"Agente Camaleão CRM"**
2. Encontre node **"🤖 Agente Camaleão"**
3. **Adicionar nova tool:**
   - Type: **HTTP Request Tool**
   - Name: `espelho_bancario_gateway`
   - Description: "Consulta recebimentos via MCP Gateway"
   - Method: POST
   - URL: `http://localhost:3100/mcp/crm/espelho_bancario`
   - Body: `{{ $json }}`

Agora o agente pode usar o Gateway diretamente!

---

## 📊 Testes Recomendados

### Teste 1: Health Check ✅
```
GET http://localhost:3100/health
```

**Esperado:** Status 200 com `"status": "online"`

---

### Teste 2: Listar MCPs ✅
```
GET http://localhost:3100/mcp/list
```

**Esperado:** Lista de servers e tools

---

### Teste 3: Espelho Bancário - Hoje ✅
```
POST http://localhost:3100/mcp/crm/espelho_bancario
Body: { "periodo": "hoje" }
```

**Esperado:** R$ 1.110,00 (Cora)

---

### Teste 4: Espelho Bancário - Esta Semana ✅
```
POST http://localhost:3100/mcp/crm/espelho_bancario
Body: { "periodo": "esta semana" }
```

**Esperado:** R$ 2.110,00 (15-16/12)

---

### Teste 5: Espelho Bancário - Novembro ✅
```
POST http://localhost:3100/mcp/crm/espelho_bancario
Body: { "periodo": "novembro" }
```

**Esperado:** Total de novembro sem timeout

---

## 🐛 Troubleshooting

### Erro: "Failed to connect"

**Causa:** Gateway não está rodando

**Solução:**
```bash
cd mcp-gateway
npm run dev
```

Veja se aparece: `🚀 Servidor rodando em: http://localhost:3100`

---

### Erro: "Timeout"

**Causa:** Consulta demorou mais de 45s

**Solução:** Período muito longo. Tente período menor.

---

### Erro: "Tool não implementada"

**Causa:** Tentando usar tool que não existe ainda

**Solução:** Use apenas `espelho_bancario` (única implementada)

---

### n8n não consegue acessar localhost:3100

**Causa:** n8n e Gateway em ambientes diferentes

**Soluções:**
1. Se n8n em Docker, use `host.docker.internal:3100`
2. Se n8n na VPS, use IP da VPS
3. Fazer deploy do Gateway na VPS também

---

## ✅ Checklist de Teste

- [ ] Gateway rodando (http://localhost:3100)
- [ ] Health check funciona
- [ ] Lista MCPs funciona
- [ ] Espelho bancário - hoje funciona
- [ ] Espelho bancário - semana funciona
- [ ] Espelho bancário - mês funciona
- [ ] Workflow importado no n8n
- [ ] Testes executam sem erro
- [ ] Resultados corretos

---

## 🎊 Após Testes Bem-Sucedidos

1. ✅ Gateway funcionando localmente
2. ✅ Integração com n8n OK
3. ➡️ Deploy na VPS (Easypanel)
4. ➡️ Atualizar URL no n8n para VPS
5. ➡️ Implementar próximas tools

---

**Precisa de ajuda?** Cole os erros aqui!
