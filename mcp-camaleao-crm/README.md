# 🦎 MCP Server Camaleão CRM

Servidor MCP (Model Context Protocol) para integração com a API GraphQL do Camaleão CRM.

> **Nota:** Este é o MCP para o **CRM**. Para WhatsApp, veja [mcp-camaleao-wpp](../mcp-camaleao-wpp/)

## 🎯 O que é?

Um servidor que expõe as funcionalidades do CRM Camaleão através do protocolo MCP, permitindo que agentes de IA (como Claude, ChatGPT, etc) consultem dados do sistema de forma estruturada e type-safe.

## ✨ Features

### Tools Disponíveis

1. **espelho_bancario** - Consulta recebimentos PIX/cartão/dinheiro
   - Suporta períodos naturais: "novembro", "ultimos 15 dias", "esta semana"
   - Timeout de 45s e limite de 2000 registros
   - Retorna total recebido, saldo e detalhes por via

2. **consultar_pedidos** - Busca pedidos por período
   - Filtra por cliente, status, data
   - Retorna total de pedidos e valor

3. **monitorar_pedidos_parados** - Detecta pedidos travados
   - Alerta pedidos críticos (>7 dias parados)
   - Identifica gargalos de produção

4. **consultar_pagamentos** - Pendências de pagamento
   - Valor total pendente
   - Pagamentos em atraso

5. **buscar_cliente** - Informações de cliente
   - Dados cadastrais
   - Pedidos recentes
   - Saldo

6. **dashboard_vendas** - Métricas de vendas
   - Vendas por cidade, modelo, categoria
   - Valor total

7. **painel_producao** - Status da produção
   - Pedidos por etapa
   - Progresso geral

## 🚀 Instalação

```bash
cd mcp-camaleao
npm install
```

## 📦 Build

```bash
npm run build
```

## 🏃 Executar

### Modo desenvolvimento (com hot reload):
```bash
npm run dev
```

### Modo produção:
```bash
npm start
```

## 🔧 Configurar no n8n

1. No n8n, adicione um MCP Server:

```json
{
  "mcpServers": {
    "camaleao-crm": {
      "command": "node",
      "args": ["C:\\Users\\Wjcam\\OneDrive\\Documentos\\GESTORCONECTA\\n8n\\mcp-camaleao\\build\\index.js"]
    }
  }
}
```

2. Reinicie o n8n

3. No workflow, use o node "MCP Tool"

4. Selecione server: `camaleao-crm`

5. Selecione tool: `espelho_bancario`, `consultar_pedidos`, etc.

## 📚 Exemplos de Uso

### Espelho Bancário

```json
{
  "tool": "espelho_bancario",
  "arguments": {
    "periodo": "novembro"
  }
}
```

```json
{
  "tool": "espelho_bancario",
  "arguments": {
    "data_inicio": "2025-12-01",
    "data_fim": "2025-12-15"
  }
}
```

### Consultar Pedidos

```json
{
  "tool": "consultar_pedidos",
  "arguments": {
    "periodo": "esta semana",
    "status": "Costurado e Embalado"
  }
}
```

### Monitorar Pedidos Parados

```json
{
  "tool": "monitorar_pedidos_parados",
  "arguments": {
    "dias_minimo": 2
  }
}
```

## 🏗️ Estrutura do Projeto

```
mcp-camaleao/
├── src/
│   ├── index.ts              # Servidor MCP principal
│   ├── lib/
│   │   ├── graphql-client.ts # Cliente GraphQL reutilizável
│   │   ├── date-parser.ts    # Parser de períodos naturais
│   │   └── formatters.ts     # Formatação de valores
│   ├── tools/
│   │   ├── espelho-bancario.ts
│   │   ├── consultar-pedidos.ts (TODO)
│   │   ├── monitorar-pedidos.ts (TODO)
│   │   └── ...
│   └── types/
│       └── index.ts          # Tipos TypeScript
├── build/                    # Código compilado
├── package.json
├── tsconfig.json
└── README.md
```

## 🔐 Segurança

- Credenciais hardcoded no código (API Gerente)
- **TODO**: Mover para variáveis de ambiente
- **TODO**: Implementar rotação de credenciais

## 📝 TODO

- [ ] Implementar tools restantes:
  - [ ] consultar_pedidos
  - [ ] monitorar_pedidos_parados
  - [ ] consultar_pagamentos
  - [ ] buscar_cliente
  - [ ] dashboard_vendas
  - [ ] painel_producao
- [ ] Adicionar cache de resultados
- [ ] Implementar retry automático
- [ ] Logs estruturados
- [ ] Testes unitários
- [ ] Variáveis de ambiente para credenciais
- [ ] Documentação completa da API

## 🐛 Debug

Logs são enviados para `stderr`:

```bash
npm run dev 2> logs.txt
```

## 📄 Licença

ISC
