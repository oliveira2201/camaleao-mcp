# 📅 GUIA: Períodos Flexíveis - Espelho Bancário v3

## ✨ O que há de novo?

A tool `espelho_bancario` agora **entende períodos naturais** e busca **TODAS as páginas necessárias**!

---

## 🎯 Formas de usar

### 1. **Dia único** (como antes)
```
"caiu quanto de pix hoje?"
"quanto entrou ontem?"
"recebimentos do dia 15/12/2025"
```

### 2. **Períodos por nome de mês**
```
"quanto entrou em pix no mes de novembro?"
"recebimentos de dezembro"
"pix de janeiro de 2025"
```

### 3. **Períodos relativos**
```
"recebimentos dos ultimos 15 dias"
"quanto caiu esta semana?"
"pix da semana passada"
"este mes"
```

### 4. **Ano completo**
```
"recebimentos do ano de 2025"
"pix em 2024"
```

### 5. **Período manual (data_inicio e data_fim)**
```json
{
  "data_inicio": "2025-11-01",
  "data_fim": "2025-11-30"
}
```

---

## 🤖 Comportamento do Agente

### Mensagem de aguarde

Quando o usuário pedir um período longo, o agente **SEMPRE avisa antes**:

**Usuário:** "quanto entrou em pix no mes de novembro?"

**Agente:**
```
⏳ Aguarde, estou calculando os recebimentos de novembro...
Retorno em alguns instantes.
```

_(Depois chama a tool e apresenta o resultado)_

---

## 📊 Formato da resposta

### Exemplo: Mês de novembro
```
📊 Recebimentos de novembro/2025:

Cora - R$ 15.420,00
Mercado Pago - R$ 3.200,00
Dinheiro - R$ 850,00

Total = R$ 19.470,00

💸 Pagamentos: R$ 8.320,00
💰 Saldo líquido: R$ 11.150,00
```

### Exemplo: Últimos 7 dias
```
📊 Recebimentos dos últimos 7 dias:

Cora - R$ 5.280,00
Dinheiro - R$ 120,00

Total = R$ 5.400,00

💸 Pagamentos: R$ 1.950,00
💰 Saldo líquido: R$ 3.450,00
```

---

## 🔧 Como funciona tecnicamente

### Parser de períodos naturais

A tool detecta automaticamente padrões como:

| Entrada | Resultado |
|---------|-----------|
| `"novembro"` | 01/11/2025 a 30/11/2025 |
| `"ultimos 15 dias"` | Hoje - 14 dias até hoje |
| `"esta semana"` | Última segunda até hoje |
| `"semana passada"` | Segunda a domingo da semana anterior |
| `"este mes"` | Dia 1 do mês até hoje |
| `"ano de 2025"` | 01/01/2025 a 31/12/2025 |

### Busca inteligente de páginas

1. Busca 100 registros por página
2. **Não tem limite** de páginas (antes era 5)
3. Para automaticamente quando:
   - Passa do período solicitado
   - Ou atinge limite de segurança (50 páginas / 5000 registros)

---

## 🧪 Exemplos de testes

### Teste 1: Mês de novembro
**Via WhatsApp:**
```
quanto entrou em pix no mes de novembro?
```

**Resposta esperada:**
```
⏳ Aguarde, estou calculando os recebimentos de novembro...
Retorno em alguns instantes.

📊 Recebimentos de novembro/2025:
[Listagem por via]
Total = R$ X.XXX,XX
```

### Teste 2: Últimos 15 dias
**Via WhatsApp:**
```
recebimentos dos ultimos 15 dias
```

**Resposta esperada:**
```
⏳ Aguarde, estou calculando os recebimentos dos últimos 15 dias...
Retorno em alguns instantes.

📊 Recebimentos dos últimos 15 dias:
[Listagem por via]
Total = R$ X.XXX,XX
```

### Teste 3: Esta semana
**Via WhatsApp:**
```
quanto caiu esta semana?
```

**Resposta esperada:**
```
📊 Recebimentos de esta semana:
[Listagem por via]
Total = R$ X.XXX,XX
```

### Teste 4: Ano de 2025
**Via WhatsApp:**
```
recebimentos do ano de 2025
```

**Resposta esperada:**
```
⏳ Aguarde, estou calculando os recebimentos do ano de 2025...
Retorno em alguns instantes.

📊 Recebimentos de ano de 2025:
[Listagem por via]
Total = R$ X.XXX,XX
```

---

## ⚡ Performance

| Período | Páginas típicas | Tempo estimado |
|---------|-----------------|----------------|
| 1 dia | 1 página | ~2 segundos |
| 1 semana | 1-2 páginas | ~3 segundos |
| 1 mês | 2-5 páginas | ~5-8 segundos |
| 1 ano | 10-50 páginas | ~15-30 segundos |

---

## 🐛 Troubleshooting

### Problema: "Não consegui obter os dados"

**Possíveis causas:**
1. Período muito antigo (dados não existem no banco)
2. Erro na API GraphQL
3. Timeout (período muito longo)

**Solução:**
- Veja os logs no n8n (menu Executions)
- Verifique se os dados existem no CRM
- Tente um período menor

### Problema: Resposta incompleta

**Causa:** Limite de 50 páginas atingido

**Solução:**
- Divida o período (ex: ao invés de "ano de 2025", peça "janeiro", "fevereiro", etc)
- Ou aumente o limite no código (linha: `if (currentPage > 50)`)

### Problema: Não exibe mensagem de aguarde

**Causa:** Período considerado curto pelo agente (< 7 dias)

**Esperado:** Períodos curtos não precisam de mensagem de aguarde

---

## 📝 Notas técnicas

### Timezone

Todas as datas são processadas no **fuso horário de São Paulo** (America/Sao_Paulo).

### Formatos aceitos

| Formato | Exemplo | Tipo |
|---------|---------|------|
| `YYYY-MM-DD` | `2025-12-16` | ISO |
| `DD/MM/YYYY` | `16/12/2025` | BR |
| `"hoje"` ou `"hj"` | - | Palavra-chave |

### Campos de entrada

A tool aceita qualquer um destes campos:
- `data` - Para dia único
- `data_inicio` + `data_fim` - Para período manual
- `periodo` - Para período natural
- `mes` - Alias para período
- `quando` - Alias para período

---

## 🚀 Próximos passos

Após importar o workflow v3 no n8n:

1. ✅ Teste com dia único: "caiu quanto de pix hoje?"
2. ✅ Teste com mês: "quanto entrou em novembro?"
3. ✅ Teste com período relativo: "ultimos 15 dias"
4. ✅ Verifique se a mensagem de aguarde aparece
5. ✅ Confirme que busca todas as páginas necessárias

---

**Versão:** v3
**Última atualização:** 16/12/2025
**Arquivo:** `Agente Camaleão CRM v3 (períodos flexíveis + mensagem de aguarde).json`
