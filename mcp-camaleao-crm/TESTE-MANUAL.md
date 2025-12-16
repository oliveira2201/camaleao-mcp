# 🧪 Teste Manual - MCP Camaleão CRM

## ⚠️ IMPORTANTE: Verificar suporte MCP no n8n

O n8n precisa ter suporte a MCP (disponível a partir da versão 1.60.0+).

### Verificar versão do n8n

```bash
n8n --version
# ou
npm list -g n8n
```

Se a versão for < 1.60.0, atualize:
```bash
npm update -g n8n
```

---

## 🎯 Opção 1: Teste via n8n (se tiver suporte MCP)

### Passo 1: Criar arquivo de configuração MCP

Crie o arquivo de configuração do n8n para MCP.

**Localização típica:**
- Windows: `C:\Users\<SEU_USUARIO>\.n8n\config\mcp.json`
- Linux/Mac: `~/.n8n/config/mcp.json`

Se a pasta não existir, crie:
```bash
mkdir -p ~/.n8n/config
```

**Conteúdo do arquivo `mcp.json`:**

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

⚠️ **IMPORTANTE:**
- Use caminho ABSOLUTO
- Windows: use barras duplas `\\`
- Linux/Mac: use barra simples `/`

### Passo 2: Reiniciar n8n

```bash
# Parar o n8n (Ctrl+C se estiver rodando)
# Iniciar novamente
n8n start
```

### Passo 3: Verificar conexão

1. Abra n8n no navegador
2. Vá em **Settings** → **MCP Servers** (se disponível)
3. Verifique se `camaleao-crm` aparece na lista
4. Status deve estar **Connected** (🟢)

### Passo 4: Criar workflow de teste

**Crie um novo workflow:**

1. Adicione node **Manual Trigger**
2. Adicione node **AI Agent** (OpenAI, Anthropic, etc)
3. Configure o AI Agent:
   - Prompt: `{{ $json.pergunta }}`
   - System Message: "Você é um assistente que usa a tool espelho_bancario"
4. Em **Tools**, adicione **MCP Tool**:
   - Server: `camaleao-crm`
   - Tool: `espelho_bancario`
5. Conecte Manual Trigger → AI Agent

**Entrada de teste:**

```json
{
  "pergunta": "quanto caiu de pix hoje?"
}
```

**Executar** e ver resultado.

---

## 🔧 Opção 2: Teste direto via CLI (sem n8n)

Se o n8n não tiver suporte MCP ainda, teste o servidor diretamente.

### Passo 1: Rodar o servidor

```bash
cd mcp-camaleao-crm
npm run dev
```

Você verá:
```
🚀 MCP Server Camaleão CRM iniciado!
📡 Aguardando conexões...
```

### Passo 2: Testar com cliente MCP

Instale um cliente MCP de teste:

```bash
npm install -g @modelcontextprotocol/inspector
```

Execute:
```bash
mcp-inspector node build/index.js
```

Isso abrirá uma interface web onde você pode testar as tools.

---

## 🐛 Opção 3: Teste via script Node.js

Se preferir testar programaticamente:

### Criar arquivo de teste

```javascript
// test-mcp.js
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function testar() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['build/index.js'],
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0',
  }, {
    capabilities: {},
  });

  await client.connect(transport);

  // Listar tools disponíveis
  const tools = await client.listTools();
  console.log('Tools disponíveis:', tools);

  // Executar espelho_bancario
  const result = await client.callTool({
    name: 'espelho_bancario',
    arguments: {
      data: 'hoje'
    }
  });

  console.log('Resultado:', result);

  await client.close();
}

testar().catch(console.error);
```

Execute:
```bash
node test-mcp.js
```

---

## ✅ Checklist de Teste

### Teste 1: Hoje
- [ ] Entrada: `{ "data": "hoje" }`
- [ ] Esperado: R$ 1.110,00 (Cora)
- [ ] Status: ⬜ Não testado

### Teste 2: Esta Semana
- [ ] Entrada: `{ "periodo": "esta semana" }`
- [ ] Esperado: R$ 2.110,00 (Cora)
- [ ] Status: ⬜ Não testado

### Teste 3: Semana Passada
- [ ] Entrada: `{ "periodo": "semana passada" }`
- [ ] Esperado: R$ 12.780,00 (Cora R$ 10.985, MP R$ 275, Dinheiro R$ 1.520)
- [ ] Status: ⬜ Não testado

### Teste 4: Novembro
- [ ] Entrada: `{ "periodo": "novembro" }`
- [ ] Esperado: Total do mês (sem timeout)
- [ ] Status: ⬜ Não testado

---

## 🚨 Troubleshooting

### Erro: "Cannot find module '@modelcontextprotocol/sdk'"

**Solução:**
```bash
cd mcp-camaleao-crm
npm install
```

### Erro: "build/index.js not found"

**Solução:**
```bash
cd mcp-camaleao-crm
npm run build
```

### Erro: "MCP Server not connecting"

**Causas possíveis:**
1. Caminho errado no `mcp.json`
2. n8n não suporta MCP (versão < 1.60.0)
3. Servidor não foi compilado

**Verificar:**
```bash
# 1. Testar se o build existe
ls -la mcp-camaleao-crm/build/index.js

# 2. Testar se roda manualmente
cd mcp-camaleao-crm
npm run dev
```

### n8n não tem menu "MCP Servers"

**Causa:** Versão do n8n não suporta MCP ainda.

**Solução:** Use Opção 2 ou 3 (teste direto).

---

## 📊 Logs

Para ver logs detalhados:

```bash
cd mcp-camaleao-crm
npm run dev 2> logs.txt
```

Os logs incluem:
- `[ESPELHO] Período: ...`
- `[ESPELHO] Buscando dados...`
- `[ESPELHO] Pág X/Y - Z reg`
- `[ESPELHO] Total carregado: ...`
- `[ESPELHO] Filtrados: ...`

---

## 📝 Próximos Passos Após Teste

Se os testes passarem:
1. ✅ MCP está funcionando
2. ➡️ Implementar próxima tool (`consultar_pedidos`)

Se os testes falharem:
1. 🐛 Ver logs de erro
2. 🔧 Corrigir problemas
3. 🔄 Testar novamente

---

## 🆘 Precisa de Ajuda?

Se encontrar problemas:

1. **Cole os logs de erro** - Ajudo a debugar
2. **Informe sua versão do n8n** - `n8n --version`
3. **Teste manual funciona?** - `npm run dev`

---

**Última atualização:** 16/12/2025
**Status:** Pronto para teste
