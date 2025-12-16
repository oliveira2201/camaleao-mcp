# 🦎 Camaleão MCP Servers

Conjunto de servidores MCP (Model Context Protocol) para integração com os sistemas Camaleão.

## 📦 Servers Disponíveis

### ✅ MCP Camaleão CRM
**Pasta:** [mcp-camaleao-crm/](mcp-camaleao-crm/)
**Servidor:** `camaleao-crm`
**Descrição:** Integração com API GraphQL do CRM Camaleão

**Tools disponíveis:**
- ✅ `espelho_bancario` - Recebimentos PIX/cartão/dinheiro
- 🚧 `consultar_pedidos` - Busca pedidos por período
- 🚧 `monitorar_pedidos_parados` - Detecta gargalos
- 🚧 `consultar_pagamentos` - Pendências
- 🚧 `buscar_cliente` - Dados do cliente
- 🚧 `dashboard_vendas` - Métricas de vendas
- 🚧 `painel_producao` - Status da produção

**Status:** 🟢 Pronto para uso

---

### 🚧 MCP Camaleão WhatsApp (Futuro)
**Pasta:** `mcp-camaleao-wpp/` (a criar)
**Servidor:** `camaleao-wpp`
**Descrição:** Integração com Evolution API para WhatsApp

**Tools planejadas:**
- `enviar_mensagem` - Enviar mensagem para cliente
- `enviar_mensagem_massa` - Broadcast
- `consultar_historico` - Histórico de conversas
- `criar_grupo` - Criar grupo WhatsApp
- `status_conexao` - Status da instância
- `validar_numero` - Verificar se número existe
- `enviar_midia` - Enviar imagem/vídeo/documento

**Status:** 🔴 Não iniciado

---

## 🏗️ Estrutura Padrão

Todos os MCP servers seguem esta estrutura:

```
mcp-camaleao-{nome}/
├── src/
│   ├── index.ts              # Servidor MCP principal
│   ├── lib/                  # Bibliotecas compartilhadas
│   │   ├── api-client.ts     # Cliente da API
│   │   ├── formatters.ts     # Formatadores
│   │   └── validators.ts     # Validações
│   ├── tools/                # Tools individuais
│   │   ├── tool-1.ts
│   │   ├── tool-2.ts
│   │   └── ...
│   └── types/                # Tipos TypeScript
│       └── index.ts
├── build/                    # Código compilado (JS)
├── package.json
├── tsconfig.json
├── README.md
└── INTEGRACAO-N8N.md
```

## 🚀 Configuração no n8n

Edite o arquivo `mcp.json` do n8n:

```json
{
  "mcpServers": {
    "camaleao-crm": {
      "command": "node",
      "args": [
        "C:\\Users\\Wjcam\\OneDrive\\Documentos\\GESTORCONECTA\\n8n\\mcp-camaleao-crm\\build\\index.js"
      ]
    },
    "camaleao-wpp": {
      "command": "node",
      "args": [
        "C:\\Users\\Wjcam\\OneDrive\\Documentos\\GESTORCONECTA\\n8n\\mcp-camaleao-wpp\\build\\index.js"
      ]
    }
  }
}
```

## 🎯 Por que MCP Servers separados?

### Vantagens da separação:

1. **Responsabilidades claras**
   - CRM → Dados de negócio (pedidos, clientes, financeiro)
   - WhatsApp → Comunicação (mensagens, grupos, mídia)

2. **Escalabilidade**
   - Cada server pode evoluir independentemente
   - Diferentes ciclos de release
   - Diferentes equipes podem manter

3. **Performance**
   - Servidores independentes = sem conflito de recursos
   - Caching específico para cada domínio
   - Melhor isolamento de falhas

4. **Manutenção**
   - Bugs em um não afetam o outro
   - Deploy independente
   - Testes isolados

5. **Futuro**
   - Fácil adicionar mais servers:
     - `camaleao-meta-ads` - Facebook Ads
     - `camaleao-analytics` - Relatórios BI
     - `camaleao-estoque` - Gestão de estoque

## 📊 Comparação

| Aspecto | Server Único | Servers Separados ✅ |
|---------|-------------|---------------------|
| **Organização** | 😰 Tudo misturado | 😊 Separado por domínio |
| **Escalabilidade** | 🟡 Limitada | 🟢 Excelente |
| **Manutenção** | 😰 Difícil | 😊 Fácil |
| **Deploy** | 🔴 Tudo junto | 🟢 Independente |
| **Performance** | 🟡 OK | 🟢 Melhor |
| **Testes** | 😰 Complexo | 😊 Isolado |

## 🛠️ Comandos Úteis

### Build todos os servers
```bash
cd mcp-camaleao-crm && npm run build
cd ../mcp-camaleao-wpp && npm run build
```

### Rodar em modo dev
```bash
# Terminal 1: CRM
cd mcp-camaleao-crm && npm run dev

# Terminal 2: WhatsApp
cd mcp-camaleao-wpp && npm run dev
```

### Instalar dependências
```bash
for dir in mcp-camaleao-*/; do
  (cd "$dir" && npm install)
done
```

## 📈 Roadmap

### Fase 1: CRM (Atual)
- [x] Estrutura base MCP
- [x] Tool espelho_bancario
- [ ] Tools restantes do CRM
- [ ] Testes unitários
- [ ] CI/CD

### Fase 2: WhatsApp
- [ ] Criar mcp-camaleao-wpp
- [ ] Integração Evolution API
- [ ] Tools de mensagens
- [ ] Tools de grupos
- [ ] Tools de mídia

### Fase 3: Expansão
- [ ] mcp-camaleao-meta-ads
- [ ] mcp-camaleao-analytics
- [ ] mcp-camaleao-estoque

## 🎓 Convenções

### Nomenclatura de Servers
```
mcp-camaleao-{dominio}
```
Exemplos: `crm`, `wpp`, `meta-ads`, `analytics`

### Nomenclatura de Tools
```
{verbo}_{substantivo}
```
Exemplos: `enviar_mensagem`, `consultar_pedidos`, `buscar_cliente`

### Tipo de Retorno
Todas as tools retornam JSON estruturado:
```typescript
{
  mensagem: string;      // Texto legível para o agente
  dados: any;            // Dados estruturados
  sucesso: boolean;      // Indicador de sucesso
}
```

## 🔐 Segurança

### Credenciais
- ⚠️ **Atual:** Hardcoded no código
- ✅ **Ideal:** Variáveis de ambiente no `mcp.json`

### Exemplo seguro:
```json
{
  "mcpServers": {
    "camaleao-crm": {
      "command": "node",
      "args": ["..."],
      "env": {
        "CRM_EMAIL": "api@email.com",
        "CRM_PASSWORD": "senha123"
      }
    }
  }
}
```

## 📚 Documentação

- [MCP Camaleão CRM](mcp-camaleao-crm/README.md)
- [Integração n8n](mcp-camaleao-crm/INTEGRACAO-N8N.md)
- MCP Camaleão WhatsApp (em breve)

## 🤝 Contribuindo

1. Escolha um server para trabalhar
2. Crie uma branch: `git checkout -b feature/nova-tool`
3. Implemente seguindo os padrões
4. Teste localmente: `npm run dev`
5. Compile: `npm run build`
6. Commit: `git commit -m "feat: adiciona tool X"`
7. Push: `git push origin feature/nova-tool`

## 📞 Suporte

- Issues: [GitHub Issues](https://github.com/...)
- Docs: Ver README de cada server
- Logs: `npm run dev 2> logs.txt`

---

**Versão:** 1.0.0
**Última atualização:** 16/12/2025
**Maintainer:** Wjcam + Claude
