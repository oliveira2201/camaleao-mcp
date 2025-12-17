# 🔧 CHANGELOG: Espelho Bancário v3.1 - Correção de Timeout

## 📋 Problema Reportado

**Sintoma**: Consulta travava por 10+ minutos sem resposta
**Usuário relatou**: "10minutos esperando, e nao tem nem uma tarefa sendo executada"
**Quando ocorre**: Em consultas de período longo (mês, ano, muitos dias)

---

## ✅ Correções Aplicadas (v3.1)

### 1. **Timeout de 45 segundos**
```javascript
const TIMEOUT_MS = 45000; // 45 segundos

const resultado = await Promise.race([
  executar(),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout: consulta demorou mais de 45s')), TIMEOUT_MS)
  )
]);
```

**Comportamento**:
- Se a consulta demorar mais de 45s, retorna erro gracioso
- Não trava indefinidamente
- Usuário recebe mensagem de erro ao invés de esperar para sempre

### 2. **Redução do limite de páginas**
```javascript
const MAX_PAGINAS = 20; // Máximo 2000 registros (antes era 50)
```

**Por quê**:
- 20 páginas = até 2000 registros (2-3 meses de dados típicos)
- Reduz chance de timeout em períodos muito longos
- Mantém performance adequada

### 3. **Simplificação do código**
- Removeu lógica complexa de detecção de período
- Busca todas as páginas e filtra depois (mais simples e confiável)
- Menos pontos de falha

### 4. **Logs melhorados**
```javascript
console.log(`[ESPELHO v3.1] Período: ${periodoLabel} (${dataInicio} a ${dataFim})`);
console.log(`[ESPELHO] Pág ${currentPage}/${totalPages} - ${data.length} reg`);
console.log(`[ESPELHO] Total carregado: ${allEntries.length}`);
console.log(`[ESPELHO] Filtrados: ${filtered.length}`);
```

**Utilidade**:
- Permite monitorar progresso no n8n
- Identifica gargalos
- Facilita debug

---

## 🧪 Como Testar

### Teste 1: Dia único (deve ser rápido)
**Via WhatsApp:**
```
caiu quanto de pix hoje?
```

**Resultado esperado:**
- Resposta em ~2-3 segundos
- Sem mensagem de aguarde (período curto)
- Valores corretos

### Teste 2: Mês atual (deve ter mensagem de aguarde)
**Via WhatsApp:**
```
quanto caiu de pix esse mes?
```

**Resultado esperado:**
```
⏳ Aguarde, estou calculando os recebimentos de este mês...
Retorno em alguns instantes.

[após 5-10 segundos]

📊 Recebimentos de este mês:

Cora - R$ X.XXX,XX
Dinheiro - R$ XXX,XX
...
Total = R$ X.XXX,XX
```

### Teste 3: Período longo (pode atingir timeout)
**Via WhatsApp:**
```
recebimentos do ano de 2025
```

**Resultado esperado (se < 45s):**
```
⏳ Aguarde, estou calculando os recebimentos de ano de 2025...
Retorno em alguns instantes.

[após 15-30 segundos]

📊 Recebimentos de ano de 2025:
...
```

**Resultado esperado (se > 45s):**
```
⏳ Aguarde, estou calculando os recebimentos de ano de 2025...
Retorno em alguns instantes.

[após 45 segundos]

❌ Desculpe, a consulta demorou mais de 45 segundos e foi cancelada para evitar travamento.

Sugestão: Tente um período menor, como "recebimentos de dezembro" ou "ultimos 30 dias".
```

---

## 📊 Performance Esperada

| Período | Páginas | Tempo típico | Timeout? |
|---------|---------|--------------|----------|
| 1 dia | 1 | 2-3s | Não |
| 1 semana | 1-2 | 3-5s | Não |
| 1 mês | 2-5 | 5-10s | Não |
| 3 meses | 6-15 | 10-20s | Raro |
| 6 meses | 12-20 | 20-40s | Possível |
| 1 ano | 20 (limite) | 30-45s | Provável |

---

## 🐛 Se o Problema Persistir

### Sintoma: Ainda trava por 10+ minutos

**Possíveis causas**:
1. Timeout não está sendo aplicado (erro no código)
2. API GraphQL está muito lenta
3. Problema de rede/conexão

**Debug**:
1. Veja os logs no n8n (Executions > Ver execução)
2. Verifique se aparece `[ESPELHO v3.1] Período: ...`
3. Monitore quantas páginas foram buscadas
4. Se não aparecer logs, o problema é antes da tool (conexão ou agente)

### Sintoma: Timeout muito rápido (falso positivo)

**Causa**: 45s pode ser insuficiente para períodos muito longos

**Solução**: Aumentar TIMEOUT_MS
```javascript
const TIMEOUT_MS = 90000; // 90 segundos (1min30s)
```

### Sintoma: Dados incompletos

**Causa**: Atingiu limite de 20 páginas

**Solução**: Dividir período
- Ao invés de "ano de 2025"
- Pergunte "janeiro", "fevereiro", etc.

Ou aumentar MAX_PAGINAS:
```javascript
const MAX_PAGINAS = 30; // 3000 registros
```

---

## 📝 Arquivos Alterados

1. ✅ `tool-espelho-bancario-v3.1-TIMEOUT.js` - Código corrigido
2. ✅ `atualizar-tool-espelho.py` - Script de atualização
3. ✅ `workflows/agente-camaleao-crm/Agente Camaleão CRM.json` - Workflow atualizado

---

## 🚀 Próximos Passos

1. **Importe o workflow atualizado no n8n**
   - Delete o workflow antigo (ou desative)
   - Importe: `Agente Camaleão CRM v3.1 (períodos + timeout + proteções).json`

2. **Teste os 3 cenários acima**
   - Dia único
   - Mês atual
   - Período longo

3. **Monitore os logs**
   - Veja se aparecem as mensagens `[ESPELHO v3.1]`
   - Verifique quanto tempo demora cada consulta
   - Confirme que não trava mais

4. **Ajuste se necessário**
   - Se 45s for pouco, aumente TIMEOUT_MS
   - Se 20 páginas for pouco, aumente MAX_PAGINAS
   - Se ainda travar, investigue a API GraphQL

---

**Versão**: v3.1
**Data**: 16/12/2025
**Correção para**: Issue de timeout de 10+ minutos
**Status**: Pronto para teste
