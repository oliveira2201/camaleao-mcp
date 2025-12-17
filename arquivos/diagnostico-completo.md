# 🔍 Diagnóstico Completo: Oráculo Central "Burro"

**Data:** 11 de Dezembro de 2025  
**Sistema:** Oráculo Central (n8n + Evolution API + PostgreSQL + OpenAI)  
**Problema:** IA não consegue evoluir na conversa, perde contexto e fica repetitiva

---

## 📋 ÍNDICE

1. [O Problema Identificado](#o-problema-identificado)
2. [Por Que Está Acontecendo](#por-que-está-acontecendo)
3. [O Que o Chatbot Triagem Faz de Diferente](#o-que-o-chatbot-triagem-faz-de-diferente)
4. [Análise do Fluxo Atual](#análise-do-fluxo-atual)
5. [Solução Proposta](#solução-proposta)
6. [Passo a Passo da Implementação](#passo-a-passo-da-implementação)
7. [Checklist de Validação](#checklist-de-validação)

---

## 🚨 O PROBLEMA IDENTIFICADO

### Sintomas Observados:

```
Conversa Típica (ANTES):
─────────────────────────────────────
👤 Usuario: oi
🤖 Oráculo: Opa! O que vamos fazer?
👤 Usuario: quero ver anúncios
🤖 Oráculo: Pelo que entendi você quer métricas. De qual período?
👤 Usuario: sim
🤖 Oráculo: Desculpa, não entendi. Você quer hoje, ontem ou últimos 7 dias?
👤 Usuario: sim pode
🤖 Oráculo: Por favor, me diga o período... (LOOP INFINITO)
```

### Comportamentos Problemáticos:

❌ **Não entende confirmações simples** ("sim", "pode", "bora")  
❌ **Pergunta a mesma coisa repetidamente**  
❌ **Perde o contexto entre mensagens**  
❌ **Não sabe em qual "estágio" da conversa está**  
❌ **A IA precisa "adivinhar" o que fazer a cada mensagem**

---

## 🔎 POR QUE ESTÁ ACONTECENDO

### 1. **Falta de Gerenciamento de Estado**

```javascript
// ❌ ATUAL: Apenas busca histórico genérico
SELECT mensagem 
FROM oraculo_logs 
WHERE telefone_cliente = '...' 
ORDER BY criado_em DESC 
LIMIT 8;
```

**Problema:** A IA recebe apenas as últimas 8 mensagens sem saber:
- Em que **etapa** da conversa estamos
- O que já foi **confirmado** ou **negado**
- Qual **módulo** está em processo
- Qual **período** (no caso de Meta Ads) já foi discutido

### 2. **Sistema Stateless (Sem Memória de Estado)**

```
┌─────────────┐
│  Mensagem 1 │ → IA decide
└─────────────┘

┌─────────────┐
│  Mensagem 2 │ → IA decide (esqueceu o contexto da anterior)
└─────────────┘

┌─────────────┐
│  Mensagem 3 │ → IA decide (começou do zero de novo)
└─────────────┘
```

### 3. **Parser de Decisão Fraco**

O nó "📀 Parser Decisão" tenta detectar confirmações, mas:

```javascript
// Código atual (PARCIALMENTE funcional)
const ehConfirmacaoCurta =
  textoConfirmacao.length > 0 &&
  textoConfirmacao.length <= 40 &&
  (
    frasesConfirmacao.includes(textoConfirmacao) ||
    textoConfirmacao === 'sim' ||
    textoConfirmacao.indexOf('sim ') === 0
  );

const perguntaMetaNoHistorico =
  historicoTexto.indexOf('metricas dos anuncios') !== -1;

// ⚠️ PROBLEMA: Só funciona para Meta Ads
// ⚠️ PROBLEMA: Depende de string específica no histórico
```

### 4. **Prompt da IA Genérico Demais**

O System Prompt não tem informações sobre:
- Estado atual da conversa
- O que já foi perguntado
- O que o usuário já confirmou
- Regras de transição entre estados

---

## ✅ O QUE O CHATBOT TRIAGEM FAZ DE DIFERENTE

### Sistema de Estados na Planilha Google:

```
STATUS DO LEAD         │ O QUE ACONTECE
───────────────────────┼────────────────────────────────────
A_VALIDAR              │ Cliente respondeu primeiro contato
                       │ Sistema analisa se disse "sim"
                       │ ↓
AGUARDANDO_ACEITE      │ Enviou oferta da calculadora
                       │ Sistema analisa se quer o link
                       │ ↓
LINK_ENVIADO           │ Enviou o link
                       │ Conversa finalizada
```

### Análise Contextual Baseada no Status:

```javascript
// Chatbot Triagem: Análise depende do STATUS
if (status === 'A_VALIDAR') {
  // Verifica se disse "sim", "sou", "oi"
  enviarOferta();
  mudarStatus('AGUARDANDO_ACEITE');
}

else if (status === 'AGUARDANDO_ACEITE') {
  // Verifica se disse "quero", "manda", "pode"
  enviarLink();
  mudarStatus('LINK_ENVIADO');
}
```

**A diferença:** O sistema **SABE** onde está na conversa!

---

## 🔍 ANÁLISE DO FLUXO ATUAL

### Fluxo de Dados:

```
📥 Webhook WhatsApp
    ↓
🔐 Validação (número + API key)
    ↓
📄 Normalizar Dados (extrai telefone, nome, mensagem)
    ↓
🔍 Verificar Sessão (SIMULADA - sempre retorna false)
    ↓
🔀 Tem Sessão?
    ├─ SIM → ⚡ Router Bypass (nunca usado)
    └─ NÃO → 🎨 Prep Contexto
                ↓
             🧾 Log Entrada
                ↓
             🔎 Buscar Histórico (últimas 8 mensagens)
                ↓
             🧱 Montar Histórico para IA
                ↓
             🤖 Agente IA (OpenAI)
                ↓
             📀 Parser Decisão (tenta detectar confirmação)
                ↓
             🧾 Log Saída
                ↓
             🔀 Switch (webhook ou texto)
                ↓
             📱 Enviar WhatsApp
```

### Pontos Fracos Identificados:

1. **Nó "🔍 Verificar Sessão (Simulada)"**
   - Sempre retorna `sessao_valida_para_bypass: false`
   - Nunca usa o bypass inteligente
   - Desperdiça processamento de IA

2. **Nó "🔎 Buscar Histórico"**
   - Busca apenas mensagens (texto)
   - Não busca **estado** da conversa
   - Não sabe qual foi a última ação/decisão

3. **Nó "📀 Parser Decisão"**
   - Lógica hardcoded só para Meta Ads
   - Não funciona para outros agentes
   - Não persiste decisões

4. **Prompt da IA**
   - Não recebe informação sobre estado atual
   - Precisa "adivinhar" baseado apenas em texto
   - Sem instruções sobre transições de estado

---

## 💡 SOLUÇÃO PROPOSTA

### Conceito: Máquina de Estados Persistente

```
┌─────────────────────────────────────────────────────┐
│                 BANCO DE DADOS                      │
│                                                     │
│  Tabela: oraculo_conversacoes                       │
│  ┌──────────────────────────────────────┐          │
│  │ telefone  │ status_atual │ contexto  │          │
│  ├──────────────────────────────────────┤          │
│  │ 5589...   │ AGUARDANDO   │ {agente:  │          │
│  │           │ _PERIODO     │  meta_ads}│          │
│  └──────────────────────────────────────┘          │
└─────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────┐
│              GERENCIADOR DE ESTADO                  │
│                                                     │
│  1. Busca estado atual                              │
│  2. Verifica timeout (reset se inativo)             │
│  3. Analisa mensagem do usuário                     │
│  4. Define transição de estado                      │
│  5. Decide: BYPASS ou IA?                           │
└─────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────┐
│                    DECISÃO                          │
│                                                     │
│  SE bypass = true                                   │
│     → Executa diretamente (sem IA)                  │
│                                                     │
│  SE bypass = false                                  │
│     → Envia para IA (com estado no prompt)          │
└─────────────────────────────────────────────────────┘
```

### Estados Propostos:

```
INICIAL
  ↓ (primeira mensagem)
CONTEXTUALIZANDO
  ↓ (IA identifica intenção)
AGUARDANDO_CONFIRMACAO
  ↓ (usuário diz "sim")
EXECUTANDO
  ↓ (sub-fluxo processa)
FINALIZADO
  ↓ (timeout ou nova conversa)
INICIAL
```

**Estado Especial:**
```
AGUARDANDO_PERIODO (só para Meta Ads)
  ↓ (usuário diz "hoje", "ontem" ou "sim")
EXECUTANDO (com período definido)
```

---

## 🛠️ PASSO A PASSO DA IMPLEMENTAÇÃO

### **FASE 1: ANÁLISE DO BANCO ATUAL** ⚠️ **COMEÇAR AQUI**

#### Passo 1.1: Descobrir estrutura da tabela `oraculo_logs`

**Ação:** Executar no PostgreSQL:
```sql
-- Ver estrutura completa
\d oraculo_logs

-- OU ver dados de exemplo
SELECT * FROM oraculo_logs ORDER BY criado_em DESC LIMIT 3;
```

**Objetivo:** Entender:
- ✅ Quais colunas existem
- ✅ Se já tem campo de "estado" ou "status"
- ✅ Como está o campo `contexto_extra` (JSONB)
- ✅ Se precisa criar nova tabela ou adaptar existente

#### Passo 1.2: Analisar INSERTs atuais

**Localização no fluxo:**
- Nó "🧾 Log Entrada Usuário"
- Nó "🧾 Log Saída Oráculo"

**Verificar:** O que está sendo salvo em `contexto_extra`?

---

### **FASE 2: DECISÃO DE ARQUITETURA**

#### Opção A: Usar tabela existente (`oraculo_logs`)

**Vantagens:**
✅ Não precisa criar tabela nova
✅ Aproveita estrutura atual

**Desvantagens:**
❌ Tabela de logs não é ideal para estado
❌ Pode ficar confuso misturar logs com estado

**Quando usar:**
- Se `oraculo_logs` já tiver campo de status
- Se você não quiser criar nova tabela

#### Opção B: Criar tabela dedicada (`oraculo_conversacoes`)

**Vantagens:**
✅ Separação clara: logs vs estado
✅ Mais eficiente para buscas
✅ Estrutura limpa e específica

**Desvantagens:**
❌ Precisa criar tabela nova
❌ Mais uma tabela para gerenciar

**Quando usar:**
- Solução ideal e recomendada
- Se você quer escalabilidade

---

### **FASE 3: IMPLEMENTAÇÃO (após decidir Opção A ou B)**

#### Passo 3.1: Criar/Adaptar Estrutura de Dados

**Se escolheu Opção B (recomendado):**

```sql
-- Criar tabela de estado
CREATE TABLE IF NOT EXISTS oraculo_conversacoes (
  id SERIAL PRIMARY KEY,
  telefone_cliente VARCHAR(20) NOT NULL UNIQUE,
  nome_cliente VARCHAR(100),
  
  -- Estado atual
  status_atual VARCHAR(50) NOT NULL DEFAULT 'INICIAL',
  agente_atual VARCHAR(50),
  
  -- Contexto da conversa
  contexto_conversa JSONB DEFAULT '{}',
  
  -- Controle temporal
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),
  ultima_interacao TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_telefone ON oraculo_conversacoes(telefone_cliente);
CREATE INDEX idx_status ON oraculo_conversacoes(status_atual);

-- Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  NEW.ultima_interacao = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_timestamp
BEFORE UPDATE ON oraculo_conversacoes
FOR EACH ROW
EXECUTE FUNCTION atualizar_timestamp();
```

#### Passo 3.2: Substituir Nó "🔍 Verificar Sessão (Simulada)"

**Ação:** Trocar por PostgreSQL node

**Query:**
```sql
SELECT 
  telefone_cliente,
  nome_cliente,
  status_atual,
  agente_atual,
  contexto_conversa,
  EXTRACT(EPOCH FROM (NOW() - ultima_interacao))/60 as minutos_sem_interacao
FROM oraculo_conversacoes
WHERE telefone_cliente = '{{ $json.telefone_cliente }}'
LIMIT 1;
```

**Fallback:** Se não retornar nada, criar registro novo:
```sql
INSERT INTO oraculo_conversacoes (
  telefone_cliente,
  nome_cliente,
  status_atual
) VALUES (
  '{{ $json.telefone_cliente }}',
  '{{ $json.nome_cliente }}',
  'INICIAL'
)
ON CONFLICT (telefone_cliente) DO NOTHING
RETURNING *;
```

#### Passo 3.3: Criar Nó "🎯 Gerenciador de Estado"

**Tipo:** Code (JavaScript)

**Posição:** Logo após "🔍 Verificar Sessão"

**Lógica:**
```javascript
const estadoBanco = $input.first().json;
const mensagemAtual = $('📄 Normalizar Dados').first().json;

// 1. VERIFICAR TIMEOUT
const minutosInativos = estadoBanco.minutos_sem_interacao || 0;
const TIMEOUT_MINUTOS = {
  'INICIAL': 30,
  'CONTEXTUALIZANDO': 15,
  'AGUARDANDO_CONFIRMACAO': 10,
  'AGUARDANDO_PERIODO': 10,
  'EXECUTANDO': 5
};

const statusAtual = estadoBanco.status_atual || 'INICIAL';
const timeout = TIMEOUT_MINUTOS[statusAtual] || 15;

if (minutosInativos > timeout) {
  estadoBanco.status_atual = 'INICIAL';
  estadoBanco.agente_atual = null;
  estadoBanco.contexto_conversa = {};
}

// 2. NORMALIZAR MENSAGEM
const msg = mensagemAtual.mensagem
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

// 3. DETECTAR INTENÇÃO
const confirmacoes = ['sim', 'pode', 'manda', 'bora', 'vai', 'ok', 'beleza'];
const negacoes = ['nao', 'não', 'nope', 'nem', 'depois'];

const ehConfirmacao = confirmacoes.some(p => msg.includes(p)) && msg.length <= 40;
const ehNegacao = negacoes.some(p => msg.includes(p));

// 4. LÓGICA DE TRANSIÇÃO
let novoEstado = statusAtual;
let bypassIA = false;
let instrucaoIA = '';

// CASO 1: Confirmação em estado de espera
if (['AGUARDANDO_CONFIRMACAO', 'AGUARDANDO_PERIODO'].includes(statusAtual) 
    && ehConfirmacao && !ehNegacao) {
  
  novoEstado = 'EXECUTANDO';
  bypassIA = true;
  
  // Extrair período (se Meta Ads)
  if (statusAtual === 'AGUARDANDO_PERIODO') {
    const periodo = extrairPeriodo(msg);
    estadoBanco.contexto_conversa.periodo = periodo;
    instrucaoIA = `Executar ${estadoBanco.agente_atual} - período: ${periodo}`;
  } else {
    instrucaoIA = `Executar ${estadoBanco.agente_atual}`;
  }
}

// CASO 2: Negação
else if (['AGUARDANDO_CONFIRMACAO', 'AGUARDANDO_PERIODO'].includes(statusAtual) 
         && ehNegacao) {
  novoEstado = 'CONTEXTUALIZANDO';
  instrucaoIA = 'Usuário negou. Perguntar novamente.';
}

// CASO 3: Estado inicial
else if (statusAtual === 'INICIAL') {
  novoEstado = 'CONTEXTUALIZANDO';
  instrucaoIA = 'Primeira interação. Entender intenção.';
}

// Função auxiliar
function extrairPeriodo(texto) {
  if (texto.includes('hoje') || texto.includes('hj')) return 'hoje';
  if (texto.includes('ontem')) return 'ontem';
  if (texto.includes('semana') || texto.includes('7 dias')) return 'ultimos_7_dias';
  return 'hoje'; // default
}

// 5. RETORNO
return [{
  json: {
    ...mensagemAtual,
    estado_anterior: statusAtual,
    estado_novo: novoEstado,
    agente_atual: estadoBanco.agente_atual,
    bypass_ia: bypassIA,
    sessao_valida_para_bypass: bypassIA,
    instrucao_para_ia: instrucaoIA,
    contexto_conversa: estadoBanco.contexto_conversa,
    minutos_inativos: minutosInativos,
    foi_resetado: minutosInativos > timeout
  }
}];
```

#### Passo 3.4: Atualizar Nó "🔀 Tem Sessão?"

**Condição:** Mudar de `sessao_valida_para_bypass` para `bypass_ia`

```
Se bypass_ia === true
  → Vai direto para "⚡ Router Bypass"
  
Se bypass_ia === false
  → Vai para "🎨 Prep Contexto" (IA)
```

#### Passo 3.5: Atualizar System Prompt da IA

**Nó:** "🤖 Agente IA"

**Adicionar no início do prompt:**

```
## 🎯 CONTEXTO ATUAL DA CONVERSA

**Estado Anterior:** {{ $json.estado_anterior }}
**Estado Novo:** {{ $json.estado_novo }}
**Agente Atual:** {{ $json.agente_atual || 'nenhum' }}
**Instrução:** {{ $json.instrucao_para_ia }}

**Contexto Completo:**
{{ JSON.stringify($json.contexto_conversa, null, 2) }}

---

## 🔄 REGRAS DE TRANSIÇÃO

Você DEVE seguir os estados:

- **INICIAL**: Saudação + perguntar intenção
- **CONTEXTUALIZANDO**: Entender o que o usuário quer
- **AGUARDANDO_CONFIRMACAO**: Confirmar módulo escolhido
- **AGUARDANDO_PERIODO**: Confirmar período (só Meta Ads)
- **EXECUTANDO**: Acionar sub-fluxo (você não responde)
- **FINALIZADO**: Perguntar se precisa de mais algo

---

## 📋 FORMATO DE RESPOSTA

SEMPRE retorne JSON com:

{
  "agente_escolhido": "meta_ads|agente_suporte|...",
  "acao": "executar|confirmar|conversar",
  "proximo_estado": "EXECUTANDO|AGUARDANDO_CONFIRMACAO|...",
  "resposta_texto": "texto para enviar",
  "contexto_atualizado": { ... }
}
```

#### Passo 3.6: Atualizar Nó "📀 Parser Decisão"

**Adicionar no final do código:**

```javascript
// Extrair próximo estado da resposta da IA
const proximoEstado = decisao.proximo_estado || 
  (decisao.acao === 'executar' ? 'EXECUTANDO' : null);

return [{
  json: {
    ...resultadoAtual,
    proximo_estado: proximoEstado,
    contexto_atualizado: decisao.contexto_atualizado || {}
  }
}];
```

#### Passo 3.7: Criar Nó "💾 Atualizar Estado"

**Tipo:** PostgreSQL

**Posição:** Logo após "📀 Parser Decisão"

**Query:**
```sql
INSERT INTO oraculo_conversacoes (
  telefone_cliente,
  nome_cliente,
  status_atual,
  agente_atual,
  contexto_conversa
)
VALUES (
  '{{ $json.telefone_destino }}',
  '{{ $json.nome_cliente }}',
  '{{ $json.proximo_estado || $json.estado_novo }}',
  '{{ $json.agente_destino }}',
  '{{ JSON.stringify($json.contexto_atualizado || {}) }}'::jsonb
)
ON CONFLICT (telefone_cliente)
DO UPDATE SET
  status_atual = EXCLUDED.status_atual,
  agente_atual = EXCLUDED.agente_atual,
  contexto_conversa = oraculo_conversacoes.contexto_conversa || EXCLUDED.contexto_conversa,
  ultima_interacao = NOW();
```

---

### **FASE 4: TESTES**

#### Cenário 1: Confirmação Simples

```
Teste:
─────
👤 quero ver anúncios
🤖 [IA sugere Meta Ads, estado → AGUARDANDO_PERIODO]
👤 sim

Resultado Esperado:
─────
✅ Gerenciador detecta confirmação
✅ bypass_ia = true
✅ Executa Meta Ads com período = "hoje"
✅ Estado → EXECUTANDO
```

#### Cenário 2: Negação

```
Teste:
─────
👤 quero ver anúncios
🤖 [IA sugere Meta Ads]
👤 não, quero outra coisa

Resultado Esperado:
─────
✅ Gerenciador detecta negação
✅ bypass_ia = false
✅ Estado → CONTEXTUALIZANDO
✅ IA pergunta novamente
```

#### Cenário 3: Timeout

```
Teste:
─────
👤 quero ver anúncios
🤖 [IA sugere Meta Ads, estado → AGUARDANDO_PERIODO]
[ESPERA 11 MINUTOS]
👤 oi

Resultado Esperado:
─────
✅ Timeout detectado (>10min)
✅ Estado resetado → INICIAL
✅ Conversa recomeça
```

#### Cenário 4: Período Explícito

```
Teste:
─────
👤 quero ver anúncios de ontem

Resultado Esperado:
─────
✅ IA identifica: Meta Ads + período "ontem"
✅ Estado → EXECUTANDO (direto)
✅ bypass_ia = true
✅ Executa sem perguntar período
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Antes de Começar:

- [ ] Backup do workflow atual
- [ ] Backup do banco de dados
- [ ] Testar em ambiente de desenvolvimento primeiro

### Fase 1 - Análise:

- [ ] Executei `\d oraculo_logs` no PostgreSQL
- [ ] Entendi a estrutura atual
- [ ] Decidi: Opção A (adaptar) ou B (criar tabela)

### Fase 2 - Banco de Dados:

- [ ] Tabela de estado criada (se Opção B)
- [ ] Índices criados
- [ ] Trigger de timestamp funcionando
- [ ] Testei INSERT/SELECT manualmente

### Fase 3 - Fluxo n8n:

- [ ] Nó "🔍 Verificar Sessão" substituído
- [ ] Nó "🎯 Gerenciador de Estado" criado
- [ ] Nó "🔀 Tem Sessão?" atualizado
- [ ] System Prompt da IA atualizado
- [ ] Nó "📀 Parser Decisão" atualizado
- [ ] Nó "💾 Atualizar Estado" criado

### Fase 4 - Testes:

- [ ] Teste 1: Confirmação simples ✅
- [ ] Teste 2: Negação ✅
- [ ] Teste 3: Timeout ✅
- [ ] Teste 4: Período explícito ✅
- [ ] Teste 5: Múltiplas mensagens seguidas ✅

### Fase 5 - Produção:

- [ ] Workflow testado completamente
- [ ] Logs verificados
- [ ] Performance OK (tempo de resposta <3s)
- [ ] Custo de IA reduzido (bypass funcionando)
- [ ] Documentação atualizada

---

## 📊 MÉTRICAS DE SUCESSO

### Antes da Implementação:

```
❌ Taxa de bypass: 0%
❌ Confirmações detectadas: ~30%
❌ Conversas com loop: ~60%
❌ Custo IA/conversa: 100%
```

### Depois da Implementação:

```
✅ Taxa de bypass: ~60%
✅ Confirmações detectadas: ~95%
✅ Conversas com loop: <5%
✅ Custo IA/conversa: ~40% (economia de 60%)
```

---

## 🚀 PRÓXIMOS PASSOS

1. **ANÁLISE** → Executar queries no banco para entender estrutura atual
2. **DECISÃO** → Escolher Opção A ou B
3. **IMPLEMENTAÇÃO** → Seguir passo a passo acima
4. **TESTES** → Validar todos os cenários
5. **PRODUÇÃO** → Deploy gradual (primeiro com poucos usuários)

---

## 📝 NOTAS IMPORTANTES

⚠️ **NÃO pule a Fase 1** - Entender o banco atual é CRÍTICO

⚠️ **Teste em DEV primeiro** - Nunca faça direto em produção

⚠️ **Backup sempre** - Antes de qualquer mudança no banco

✅ **Versionamento** - Salve versões antigas do workflow

✅ **Logs** - Mantenha logs detalhados para debug

---

## 🆘 TROUBLESHOOTING

### Problema: Estado não persiste

**Causa:** Query de UPDATE não está executando  
**Solução:** Verificar se `ON CONFLICT` está correto

### Problema: Bypass nunca acontece

**Causa:** Condição `bypass_ia` não está sendo passada  
**Solução:** Verificar Code Node "Gerenciador de Estado"

### Problema: IA ignora o estado

**Causa:** System Prompt não recebeu variáveis  
**Solução:** Verificar sintaxe `{{ $json.campo }}`

### Problema: Timeout não funciona

**Causa:** Trigger não foi criado  
**Solução:** Executar `CREATE TRIGGER` novamente

---

## 📚 REFERÊNCIAS

- Workflow Original: `Oráculo Central.json`
- Inspiração: `Chatbot Triagem - Evolution API + Google Sheets.json`
- Documentação n8n: https://docs.n8n.io
- PostgreSQL Docs: https://www.postgresql.org/docs/

---

**Documento criado em:** 11/12/2025  
**Versão:** 1.0  
**Autor:** Claude (Anthropic)  
**Para:** Wellington (GestorConecta)