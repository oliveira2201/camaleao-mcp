# 🔗 Integração MCP Server com n8n

## 📋 Pré-requisitos

- n8n instalado e rodando
- Node.js 18+ instalado
- MCP Server compilado (`npm run build`)

## 🚀 Passo a Passo

### 1. Localizar arquivo de configuração do n8n

O n8n armazena a configuração de MCP servers em um arquivo JSON. Localize-o:

**Windows:**
```
C:\Users\<SEU_USUARIO>\.n8n\config\mcp.json
```

Ou onde o n8n está instalado.

### 2. Editar configuração MCP

Edite o arquivo `mcp.json` e adicione:

```json
{
  "mcpServers": {
    "camaleao-crm": {
      "command": "node",
      "args": [
        "C:\\Users\\Wjcam\\OneDrive\\Documentos\\GESTORCONECTA\\n8n\\mcp-camaleao-crm\\build\\index.js"
      ],
      "env": {},
      "disabled": false
    }
  }
}
```

**Nota:** No futuro, teremos também `camaleao-wpp` para WhatsApp (Evolution API).

**IMPORTANTE:** Use caminhos absolutos e barras duplas `\\` no Windows.

### 3. Reiniciar n8n

```bash
# Se estiver rodando como serviço
systemctl restart n8n

# Se estiver rodando manualmente
# Ctrl+C e rodar novamente
n8n start
```

### 4. Verificar conexão

No n8n, vá em:
1. **Settings** > **MCP Servers**
2. Verifique se `camaleao-crm` aparece na lista
3. Status deve estar **Connected** (verde)

Se aparecer erro:
- Verifique o caminho do arquivo
- Verifique permissões
- Veja logs do n8n

## 🛠️ Usar no Workflow

### Opção A: Node "AI Agent" com MCP

1. Adicione um node **AI Agent** (OpenAI, Anthropic, etc)
2. Em **Tools**, adicione **MCP Tool**
3. Selecione server: `camaleao-crm`
4. Selecione tool: `espelho_bancario`
5. Configure parâmetros

### Opção B: Node "MCP Tool" direto

1. Adicione node **MCP Tool**
2. Server: `camaleao-crm`
3. Tool: `espelho_bancario`
4. Input:
```json
{
  "periodo": "novembro"
}
```

## 📝 Exemplo de Workflow Completo

```json
{
  "name": "Agente Camaleão CRM v4 (MCP)",
  "nodes": [
    {
      "parameters": {},
      "name": "▶️ Trigger",
      "type": "n8n-nodes-base.executeWorkflowTrigger"
    },
    {
      "parameters": {
        "model": "gpt-4o-mini",
        "prompt": "={{ $json.pergunta }}",
        "systemMessage": "Você é o Agente Camaleão CRM. Use as tools disponíveis para responder perguntas sobre o CRM.",
        "tools": {
          "values": [
            {
              "toolType": "mcp",
              "server": "camaleao-crm",
              "tool": "espelho_bancario"
            },
            {
              "toolType": "mcp",
              "server": "camaleao-crm",
              "tool": "consultar_pedidos"
            },
            {
              "toolType": "mcp",
              "server": "camaleao-crm",
              "tool": "monitorar_pedidos_parados"
            }
          ]
        }
      },
      "name": "🤖 Agente com MCP",
      "type": "@n8n/n8n-nodes-langchain.agent"
    }
  ]
}
```

## 🔍 Testar MCP Server Manualmente

Para testar se o servidor está funcionando:

```bash
cd mcp-camaleao

# Rodar em modo dev (vê os logs)
npm run dev
```

O servidor aguarda entrada via `stdin` no formato MCP. Para teste real, use a interface do n8n.

## 🐛 Troubleshooting

### Erro: "MCP Server not found"

**Causa:** Caminho incorreto ou n8n não reiniciado.

**Solução:**
1. Verifique o caminho absoluto no `mcp.json`
2. Reinicie o n8n
3. Verifique se o arquivo `build/index.js` existe

### Erro: "Connection refused"

**Causa:** Servidor MCP não está rodando.

**Solução:**
1. Verifique se `npm run build` foi executado
2. Teste rodar `npm run dev` manualmente
3. Veja se há erros de compilação

### Erro: "Tool execution failed"

**Causa:** Erro na execução da tool (API, timeout, etc).

**Solução:**
1. Veja logs do MCP server (stderr)
2. Teste a API diretamente com scripts de debug
3. Verifique credenciais da API

### MCP Server não aparece na lista

**Causa:** Arquivo `mcp.json` incorreto ou n8n não suporta MCP.

**Solução:**
1. Verifique versão do n8n (precisa ser >=1.60.0)
2. Valide sintaxe JSON do arquivo
3. Veja logs do n8n ao iniciar

## 📊 Monitoramento

Para ver logs do MCP Server:

```bash
# Redirecionar stderr para arquivo
node build/index.js 2> mcp-logs.txt

# No n8n, os logs aparecem também em Executions > Ver execução
```

## ⚡ Performance

- **Primeira chamada:** ~2-3s (login + query)
- **Chamadas subsequentes:** ~1-2s (cookies cached)
- **Timeout:** 45s para períodos longos

## 🔐 Segurança

**AVISO:** As credenciais da API estão hardcoded no código!

**TODO:** Mover para variáveis de ambiente:

1. Edite `mcp.json`:
```json
{
  "mcpServers": {
    "camaleao-crm": {
      "command": "node",
      "args": ["..."],
      "env": {
        "CAMALEAO_EMAIL": "api-gerente@email.com",
        "CAMALEAO_PASSWORD": "PPTDYBYqcmE7wg"
      }
    }
  }
}
```

2. No código `src/index.ts`:
```typescript
const EMAIL = process.env.CAMALEAO_EMAIL || '';
const PASSWORD = process.env.CAMALEAO_PASSWORD || '';
```

## ✅ Checklist de Integração

- [ ] MCP Server compilado (`npm run build`)
- [ ] Arquivo `mcp.json` configurado
- [ ] n8n reiniciado
- [ ] MCP Server aparece como "Connected"
- [ ] Teste manual da tool `espelho_bancario`
- [ ] Workflow funcionando com AI Agent
- [ ] Logs sendo monitorados

---

**Versão:** 1.0
**Última atualização:** 16/12/2025
**Compatível com:** n8n >= 1.60.0
