# 🚀 Deploy MCP Gateway no Easypanel - Passo a Passo

## ✅ Status Atual

- [x] Código commitado no Git local
- [x] Git configurado (user: Wjcam)
- [x] Commit: `032fe28` - "feat: MCP Gateway + MCP Camaleao CRM"
- [ ] Criar repositório no GitHub
- [ ] Push para GitHub
- [ ] Deploy no Easypanel

---

## 📋 PASSO 1: Criar Repositório no GitHub

### 1.1. Acesse o GitHub

**URL:** https://github.com/new

### 1.2. Configure o Repositório

- **Repository name:** `camaleao-mcp`
- **Description:** `MCP Gateway + MCP Servers para Camaleão CRM e WhatsApp`
- **Visibility:** **Private** (recomendado - contém credenciais)
- **NÃO MARQUE:** "Initialize this repository with a README"
- **NÃO MARQUE:** ".gitignore" ou "license"

### 1.3. Clique em "Create repository"

GitHub vai mostrar uma página com comandos. **Ignore os comandos do GitHub**, use os daqui:

---

## 📋 PASSO 2: Push para GitHub

### 2.1. No seu terminal (Git Bash ou PowerShell):

```bash
cd "C:\Users\Wjcam\OneDrive\Documentos\GESTORCONECTA\n8n"

# Adicionar remote (substitua SEU-USUARIO pelo seu username do GitHub)
git remote add origin https://github.com/SEU-USUARIO/camaleao-mcp.git

# Renomear branch para main
git branch -M main

# Push
git push -u origin main
```

**IMPORTANTE:** Substitua `SEU-USUARIO` pelo seu nome de usuário do GitHub!

### 2.2. Autenticação

Se pedir credenciais:
- **Username:** Seu username do GitHub
- **Password:** Use um **Personal Access Token** (não a senha normal)

**Como criar token:**
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic)
3. Scopes: marque `repo` (full control)
4. Generate token
5. **COPIE O TOKEN** (não vai aparecer de novo!)

---

## 📋 PASSO 3: Deploy no Easypanel

### 3.1. Acesse o Easypanel

**URL:** https://easypanel.gestorconecta.com.br (ou o domínio do seu Easypanel)

### 3.2. Criar Nova App

1. Clique em **"+ Create"**
2. Selecione **"App"**
3. **Name:** `mcp-gateway`
4. **Project:** (selecione seu projeto ou deixe default)

### 3.3. Configurar Source (GitHub)

**Tab: Source**

- **Type:** GitHub
- **Repository:** `seu-usuario/camaleao-mcp`
- **Branch:** `main`
- **Auto Deploy:** ✅ (marcar - faz deploy automático ao fazer push)

### 3.4. Configurar Build

**Tab: Build**

- **Builder:** Docker
- **Dockerfile Path:** `mcp-gateway/Dockerfile`
- **Build Context:** `.` (ponto = raiz do repositório)

### 3.5. Configurar Environment Variables

**Tab: Environment**

Adicione estas variáveis:

```
PORT=3100
NODE_ENV=production
CAMALEAO_API_URL=https://web-api.camaleaocamisas.com.br/graphql-api
CAMALEAO_EMAIL=api-gerente@email.com
CAMALEAO_PASSWORD=PPTDYBYqcmE7wg
```

**Como adicionar:**
1. Clique em **"+ Add Variable"**
2. Key: `PORT`, Value: `3100`
3. Repita para cada variável acima

### 3.6. Configurar Networking

**Tab: Networking**

**Port Mapping:**
- Container Port: `3100`
- Protocol: HTTP
- (Public Port será atribuído automaticamente)

**Domain (opcional mas recomendado):**
1. Clique em **"+ Add Domain"**
2. Domain: `mcp.gestorconecta.com.br` (ou outro subdomínio)
3. Enable HTTPS: ✅
4. Force HTTPS: ✅

**Se não tiver domínio**, Easypanel vai gerar um domínio automático tipo `mcp-gateway-xxxx.easypanel.host`

### 3.7. Configurar Resources (opcional)

**Tab: Resources**

Limites recomendados:
- **CPU:** 0.5 cores
- **Memory:** 512 MB
- **Storage:** 1 GB

(Pode ajustar depois se precisar mais)

### 3.8. Deploy! 🚀

1. Clique em **"Deploy"** (botão azul no topo)
2. Easypanel vai:
   - Clonar o repositório do GitHub
   - Fazer build da imagem Docker
   - Iniciar o container
   - Atribuir domínio/porta

**Tempo estimado:** 2-5 minutos

---

## 📋 PASSO 4: Verificar Deploy

### 4.1. Ver Logs

No Easypanel:
1. Clique na app `mcp-gateway`
2. Tab **"Logs"**
3. Deve aparecer:

```
🔌 Conectando ao MCP Camaleão CRM...
✅ MCP CRM conectado!
🚀 MCP Gateway rodando em: http://0.0.0.0:3100
📊 Dashboard: http://0.0.0.0:3100
📚 Docs: http://0.0.0.0:3100/mcp/list
```

### 4.2. Testar Endpoints

Abra no navegador (substitua pelo seu domínio):

**Dashboard:**
```
https://mcp.gestorconecta.com.br
```

Deve mostrar a página HTML com:
- Status: online
- Servers: 1 (CRM)
- Tools disponíveis
- Formulário de teste

**Health Check:**
```
https://mcp.gestorconecta.com.br/health
```

Deve retornar:
```json
{
  "status": "online",
  "timestamp": "2025-12-16T...",
  "uptime": 123.45,
  "version": "1.0.0"
}
```

**Listar MCPs:**
```
https://mcp.gestorconecta.com.br/mcp/list
```

Deve retornar lista de servers e tools.

### 4.3. Testar Espelho Bancário

Use curl ou Postman:

```bash
curl -X POST https://mcp.gestorconecta.com.br/mcp/crm/espelho_bancario \
  -H "Content-Type: application/json" \
  -d '{"periodo": "hoje"}'
```

Deve retornar:
```json
{
  "success": true,
  "data": {
    "periodo_label": "hoje",
    "mensagem": "📊 Recebimentos de hoje:\n\nCora - R$ 1.110,00\n\nTotal = R$ 1.110,00",
    "total_recebido": 1110,
    ...
  }
}
```

---

## 📋 PASSO 5: Integrar com n8n

### 5.1. Abrir n8n

Acesse seu n8n na VPS.

### 5.2. Importar Workflow de Teste

1. n8n → **"+ Add workflow"**
2. Menu **"⋮"** → **"Import from File"**
3. Selecione: `workflows/teste-mcp-gateway/Workflow MCP Gateway - Teste.json`

### 5.3. Atualizar URLs no Workflow

Para cada nó HTTP Request:
1. Clique no nó
2. Mude a URL de `http://localhost:3100` para:
   ```
   https://mcp.gestorconecta.com.br
   ```

Nós para atualizar:
- ❤️ Health Check
- 🔍 Teste: Hoje
- 🔍 Teste: Esta Semana
- 🔍 Teste: Novembro
- 📋 Listar MCPs

### 5.4. Executar Workflow

1. Salve o workflow
2. Clique em **"Execute Workflow"**
3. Todos os 5 testes rodam em paralelo
4. Veja os resultados

**Esperado:**
- ✅ Health Check: status "online"
- ✅ Teste Hoje: R$ 1.110,00
- ✅ Teste Semana: R$ 2.110,00
- ✅ Teste Novembro: total de novembro
- ✅ Listar MCPs: array com 1 server

---

## 📋 PASSO 6: Integrar no Agente Camaleão

### 6.1. Abrir Workflow do Agente

n8n → Workflow **"Agente Camaleão CRM"**

### 6.2. Atualizar Configuração do Agente

1. Encontre o nó **"🤖 Agente Camaleão"** (ou similar)
2. Na seção **Tools**, adicione nova tool:

**Tool Type:** HTTP Request Tool

**Configuração:**
- **Name:** `espelho_bancario_gateway`
- **Description:** `Consulta recebimentos PIX/cartão via MCP Gateway. Aceita periodo flexível: "hoje", "esta semana", "novembro", etc.`
- **Method:** POST
- **URL:** `https://mcp.gestorconecta.com.br/mcp/crm/espelho_bancario`
- **Headers:**
  - `Content-Type: application/json`
- **Body:** `{{ $json }}`

### 6.3. Testar no Chat

No chat do n8n, teste:

```
Quanto entramos hoje?
```

```
Qual foi o faturamento da semana passada?
```

```
Me mostre o espelho bancário de novembro
```

O agente deve usar o Gateway automaticamente!

---

## 🎊 Pronto! Deploy Completo!

### ✅ Checklist Final

- [ ] Gateway deployado no Easypanel
- [ ] Dashboard acessível via HTTPS
- [ ] Health check funcionando
- [ ] Workflow de teste importado no n8n
- [ ] Todos os 5 testes passando
- [ ] Agente Camaleão usando o Gateway

---

## 🐛 Troubleshooting

### Erro: Build failed no Easypanel

**Veja logs:**
1. Easypanel → App → **Logs** tab
2. Procure por erros de build

**Comum:**
- Path do Dockerfile errado → verificar: `mcp-gateway/Dockerfile`
- Context errado → deve ser `.` (raiz)
- Dependências faltando → verificar package.json

### Erro: Container keeps restarting

**Causa:** Erro ao iniciar o servidor

**Verificar:**
1. Logs do container
2. Environment variables estão corretas?
3. Porta 3100 configurada?

### Erro: n8n não consegue acessar

**Verificar:**
1. URL está correta? (HTTPS!)
2. Domínio aponta para a VPS?
3. Firewall permite conexão?
4. Teste no navegador primeiro

### Erro: "Failed to connect to MCP CRM"

**Causa:** Credenciais da API Camaleão incorretas

**Verificar:**
1. Environment variables no Easypanel
2. CAMALEAO_EMAIL e CAMALEAO_PASSWORD corretos?
3. API URL correta?

---

## 📚 Documentação de Referência

- [GUIA-RAPIDO-EASYPANEL.md](GUIA-RAPIDO-EASYPANEL.md) - Guia rápido
- [mcp-gateway/DEPLOY-EASYPANEL.md](mcp-gateway/DEPLOY-EASYPANEL.md) - Guia detalhado do gateway
- [workflows/teste-mcp-gateway/COMO-TESTAR.md](workflows/teste-mcp-gateway/COMO-TESTAR.md) - Como testar no n8n
- [MCP-SERVERS-README.md](MCP-SERVERS-README.md) - Arquitetura dos MCP servers

---

## 🔄 Próximos Passos

Após o Gateway funcionando:

1. ✅ Implementar próximas tools do CRM:
   - consultar_pedidos
   - monitorar_pedidos_parados
   - consultar_pagamentos
   - buscar_cliente
   - dashboard_vendas

2. ✅ Criar MCP Camaleão WhatsApp:
   - Integration com Evolution API
   - Enviar mensagens
   - Consultar conversas
   - Gerenciar contatos

3. ✅ Monitoramento:
   - Logs centralizados
   - Alertas de erro
   - Métricas de uso

---

**Precisa de ajuda?** Cole os erros aqui!
