# 📥 Instruções para Importar Workflow Atualizado

## ✅ O que foi feito

Criei uma nova versão do workflow "Agente Camaleão CRM" que substitui a tool "💰 Tool: Espelho Bancário" (código JavaScript embutido) por "🌐 Tool: Espelho Bancário Gateway" (HTTP Request Tool que chama o MCP Gateway).

---

## 📋 Arquivos Criados

1. **Agente Camaleão CRM.json** - Workflow atualizado com MCP Gateway
2. **Agente Camaleão CRM - BACKUP antes MCP Gateway.json** - Backup da versão anterior
3. **INSTRUCOES-IMPORTAR.md** - Este arquivo (instruções)

---

## 🔧 Passo a Passo para Importar

### 1. Fazer Backup do Workflow Atual (Opcional)

No n8n:
1. Abra o workflow **"Agente Camaleão CRM"**
2. Menu **"⋮"** → **"Duplicate"**
3. Renomeie para **"Agente Camaleão CRM - BACKUP"**

### 2. Criar Credencial da API Key

Antes de importar, você precisa criar uma credencial para o header `X-API-Key`:

1. n8n → **Settings** (⚙️) → **Credentials**
2. Clique em **"+ Add Credential"**
3. Procure por: **"HTTP Header Auth"**
4. Configure:
   - **Name:** `MCP Gateway API Key`
   - **Header Name:** `X-API-Key`
   - **Header Value:** `camaleao-mcp-e6b9c9c7e8ef5dbdfc8e80331eac4c0c254fbf6ccd7065c4af3af05a8bdeed60`
5. Clique em **"Save"**

### 3. Importar Workflow

1. n8n → **Workflows**
2. Clique em **"Import from File"** (ou no workflow existente, menu **"⋮"** → **"Import from File"**)
3. Selecione: **"Agente Camaleão CRM.json"**
4. Confirme substituição se perguntado

### 4. Configurar Credencial no Nó

Após importar, o workflow vai ter um nó novo: **"🌐 Tool: Espelho Bancário Gateway"**

Este nó vai mostrar erro porque precisa da credencial:

1. Clique no nó **"🌐 Tool: Espelho Bancário Gateway"**
2. Na seção **"Credential for HTTP Header Auth"**:
   - Se aparecer **"MCP Gateway API Key"**, está OK!
   - Se não aparecer, selecione **"MCP Gateway API Key"** da lista
3. Salve o nó

### 5. Ativar Workflow

1. Clique no botão **"Active"** (toggle no topo direito)
2. Workflow está pronto!

---

## 🧪 Testar

Teste o agente com perguntas sobre espelho bancário:

```
Quanto entramos hoje?
```

```
Qual foi o faturamento da semana passada?
```

```
Me mostre o espelho bancário de novembro
```

**Esperado:**
- O agente deve responder com os valores corretos
- SEM timeout, mesmo em períodos longos (novembro, ano inteiro, etc)
- Logs no Easypanel (mcp-gateway) vão mostrar as requisições

---

## 🔍 Verificar se Está Usando o Gateway

**Como saber se o agente está usando o MCP Gateway?**

1. Pergunte algo sobre espelho bancário
2. Vá no Easypanel → **mcp-gateway** → **Logs**
3. Deve aparecer algo como:
   ```
   [GATEWAY] Executando espelho_bancario: { periodo: 'hoje' }
   ```

Se aparecer nos logs do Easypanel, significa que está funcionando! 🎉

---

## 📊 Diferenças Principais

### Antes (Code Tool)

```
Tool Name: espelho_bancario
Type: Code Tool (JavaScript)
Timeout: 45 segundos (hardcoded)
Limite: 20 páginas (2000 registros)
Código: Embutido no workflow (difícil de atualizar)
```

### Depois (HTTP Request Tool + MCP Gateway)

```
Tool Name: espelho_bancario_gateway
Type: HTTP Request Tool
Timeout: Sem limite (roda no servidor)
Limite: Sem limite (não há limite no Gateway)
Código: Centralizado no GitHub (fácil de atualizar)
URL: https://gestorconecta-mcp-gateway.oxlser.easypanel.host/mcp/crm/espelho_bancario
```

---

## ✅ Vantagens

```
✅ SEM timeout - períodos longos funcionam
✅ Código versionado no GitHub
✅ Logs centralizados no Easypanel
✅ Fácil de debugar
✅ Fácil de atualizar (só git push)
✅ Mesma API para todos os agentes
✅ Escalável (pode adicionar cache, rate limiting, etc)
```

---

## 🐛 Troubleshooting

### Erro: "Unauthorized" ou 401

**Causa:** Credencial da API Key não configurada ou incorreta

**Solução:**
1. Vá em Settings → Credentials
2. Encontre **"MCP Gateway API Key"**
3. Verifique se o `Header Value` é exatamente:
   ```
   camaleao-mcp-e6b9c9c7e8ef5dbdfc8e80331eac4c0c254fbf6ccd7065c4af3af05a8bdeed60
   ```

### Erro: "Connection refused" ou "Service not reachable"

**Causa:** MCP Gateway offline

**Solução:**
1. Verifique Easypanel → mcp-gateway → Status
2. Se offline, clique em **"Start"**
3. Teste: https://gestorconecta-mcp-gateway.oxlser.easypanel.host/health

### Agente não usa a nova tool

**Causa:** Tool não está conectada ao agente

**Solução:**
1. Abra o workflow
2. Verifique se o nó **"🌐 Tool: Espelho Bancário Gateway"** está conectado ao nó **"🤖 Agente Camaleão"**
3. A conexão deve ser via porta **"ai_tool"**

### Workflow não importa

**Causa:** IDs de credenciais diferentes

**Solução:**
1. Importe o workflow
2. Abra o nó **"🌐 Tool: Espelho Bancário Gateway"**
3. Selecione manualmente a credencial **"MCP Gateway API Key"**
4. Salve

---

## 🎊 Pronto!

Após seguir estes passos, seu Agente Camaleão estará usando o MCP Gateway para consultas de espelho bancário, sem mais timeouts! 🚀

**Próximos passos:** Migrar as outras tools (monitorar_pedidos_parados, consultar_pedidos, consultar_pagamentos) para o MCP Gateway também!
