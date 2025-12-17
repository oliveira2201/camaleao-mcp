# Arquitetura Unificada: Oráculo Central + Camaleão WhatsApp

**Data:** 14/12/2025
**Versão:** 1.0
**Objetivo:** Integrar os 10 módulos de automação WhatsApp no fluxo do Oráculo Central

---

## 🎯 VISÃO GERAL

### Estado Atual
O **Oráculo Central** já possui:
- ✅ Normalização de dados (texto, áudio, imagem)
- ✅ Sistema de logs PostgreSQL (`oraculo_logs`)
- ✅ Agente AI com memória de conversa
- ✅ 3 Tools disponíveis:
  - `Tool: Meta Ads` (Workflow)
  - `Tool: Suporte` (Workflow)
  - `Tool: Camaleão CRM` (HTTP Request)

### Novo Sistema
Integrar **10 módulos WhatsApp** que funcionam em **2 camadas paralelas**:

#### CAMADA 1: Análise Passiva (Background)
Roda **em paralelo** ao Oráculo, sem bloquear resposta ao usuário:
- Auditoria Financeira (Anti-Pix)
- Termômetro de Crise
- Supervisor de Qualidade
- Gestor de Aprovação
- Extrator de Grade
- Ponto Invisível

#### CAMADA 2: Ferramentas Ativas (Tools)
Ferramentas que o **Agente Oráculo CHAMA quando necessário**:
- Recuperador de Vácuo (via tool `listar_followups`)
- Copiloto Técnico (via tool `consultar_base_conhecimento`)
- Radar de Recompra (via tool `verificar_recompras`)
- Gamificação/Ranking (via tool `ranking_equipe`)

---

## 🏗️ ARQUITETURA PROPOSTA

```
┌─────────────────────────────────────────────────────────────────┐
│  ENTRADA: Evolution API Webhook                                 │
│  POST /webhook-whatsapp                                         │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  📄 Normalizar Dados (já existe)                                │
│  ├─ sessionId, telefone, nome, mensagem                         │
│  ├─ messagetype, message_id, timestamp                          │
│  └─ instance, apikey, server_url                                │
└──────────────────┬──────────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌──────────────────┐   ┌──────────────────────────────────────────┐
│  🧾 Log Entrada  │   │  💾 Registro WhatsApp (NOVO)             │
│  (já existe)     │   │  ├─ Grava em wa_mensagens                │
│  PostgreSQL      │   │  ├─ Atualiza wa_conversas                │
└──────────────────┘   │  └─ Retorna conversa_id, mensagem_id    │
                       └──────────┬───────────────────────────────┘
                                  │
                       ┌──────────┴──────────┐
                       │                     │
                       ▼                     ▼
        ┌──────────────────────────┐   ┌──────────────────────────┐
        │  🔍 CAMADA PASSIVA       │   │  🤖 Agente Oráculo       │
        │  (Análise Background)    │   │  (Resposta ao Cliente)   │
        │  NÃO bloqueia resposta   │   │  Fluxo principal         │
        └──────┬───────────────────┘   └────────┬─────────────────┘
               │                                 │
               ▼                                 ▼
        ┌─────────────────────────┐      ┌────────────────────────┐
        │  Módulos Paralelos:     │      │  Tools Disponíveis:    │
        │  1. Anti-Pix            │      │  - Meta Ads            │
        │  2. Termômetro Crise    │      │  - Suporte             │
        │  3. Gestor Aprovação    │      │  - Camaleão CRM        │
        │  4. Extrator Grade      │      │  - Followups (NOVO)    │
        │  5. Supervisor Qualidade│      │  - Base Conhecimento   │
        │  6. Ponto Invisível     │      │  - Recompras           │
        └─────────┬───────────────┘      │  - Ranking             │
                  │                      └────────┬───────────────┘
                  ▼                               │
        ┌─────────────────────────┐              │
        │  💾 Grava Alertas       │              │
        │  em wa_alertas          │              │
        │  (se necessário)        │              │
        └─────────────────────────┘              │
                                                  ▼
                                          ┌───────────────────────┐
                                          │  📤 Resposta Evolution│
                                          │  Envia pro cliente    │
                                          └───────────────────────┘
```

---

## 📋 DETALHAMENTO DAS CAMADAS

### CAMADA PASSIVA (Background - Não bloqueia)

Funciona como **middleware** que analisa TODAS as mensagens:

#### Node: "🔍 Análise Background WhatsApp"
- **Tipo:** Workflow separado chamado assincronamente
- **Entrada:** Todos os dados normalizados + `conversa_id`, `mensagem_id`
- **Saída:** Não afeta o fluxo principal (fire-and-forget)
- **Contém:**

**1. Anti-Pix Suspeito**
```javascript
// Detecta chaves Pix em mensagens fromMe
if (is_from_me && detectouChavePix(conteudo)) {
  const oficial = await verificaAllowlist(chave);
  if (!oficial) {
    criarAlerta('PIX_SUSPEITO', 'HIGH', {
      chave_detectada,
      atendente,
      cliente,
      trecho
    });
  }
}
```

**2. Termômetro de Crise**
```javascript
// Classifica risco do cliente
const risco = await analisarSentimento(mensagem);
const palavrasGatilho = ['procon', 'processo', 'estorno', 'cancelar'];

if (risco === 'HIGH' || contemPalavraGatilho) {
  criarAlerta('CRISE_CLIENTE', 'HIGH', {
    sentimento: risco,
    gatilhos_encontrados,
    contexto_ultimas_5_msgs
  });

  // Tag na conversa
  await tagConversation(conversa_id, 'CRISE');
}
```

**3. Gestor de Aprovação**
```javascript
// Detecta envio de arte
if (is_from_me && (tipo === 'image' || tipo === 'document')) {
  const contemArte = await detectarArte(mensagem);
  if (contemArte) {
    marcarStatus(pedido_id, 'ARTE_ENVIADA');
  }
}

// Detecta aprovação do cliente
if (!is_from_me && contemAprovacao(mensagem)) {
  registrarAprovacao(pedido_id, {
    mensagem_id,
    timestamp,
    texto_aprovacao
  });
  marcarStatus(pedido_id, 'ARTE_APROVADA');
}
```

**4. Extrator de Grade**
```javascript
// Detecta pedido em texto
const padroesPedido = /(\d+)\s*(camiseta|baby|regata)/gi;
if (conteudo.match(padroesPedido)) {
  const resultado = await extrairGrade(conteudo);

  if (resultado.confidence >= 0.70) {
    salvarPedido(conversa_id, resultado.itens);
  } else {
    criarAlerta('PEDIDO_DUVIDOSO', 'MEDIUM', {
      itens_extraidos: resultado.itens,
      confidence: resultado.confidence,
      campos_duvidosos: resultado.campos_duvidosos
    });
  }
}
```

**5. Supervisor de Qualidade**
```javascript
// Roda 1x/dia via Cron (não em cada mensagem)
// Analisa amostra do dia anterior
const amostra = await getAmostraDia(atendente_id, ontem);
const avaliacao = await avaliarQualidade(amostra);

salvarAvaliacao({
  atendente_id,
  data,
  nota: avaliacao.nota,
  pontos_fortes: avaliacao.pontos_fortes,
  ajuste_pratico: avaliacao.ajuste
});
```

**6. Ponto Invisível**
```javascript
// Registra atividade do atendente
if (is_from_me && atendente_id) {
  await registrarAtividade(atendente_id, timestamp);
}

// Cron diário: identifica ausências
// SELECT atendentes sem atividade no dia
```

---

### CAMADA ATIVA (Tools - Chamados pelo Agente)

#### Tool 1: `listar_followups` (Recuperador de Vácuo)
**Quando usar:** Usuário pergunta "quais clientes preciso fazer follow-up?"

**Funcionamento:**
```sql
SELECT
  c.remote_jid,
  c.atendente_id,
  m.conteudo AS ultima_msg,
  m.enviado_em,
  EXTRACT(EPOCH FROM (NOW() - m.enviado_em))/3600 AS horas_sem_resposta
FROM vw_wa_ultima_mensagem_por_conversa v
JOIN wa_conversas c ON c.id = v.conversa_id
JOIN wa_mensagens m ON m.id = v.mensagem_id
WHERE
  v.is_from_me = TRUE
  AND m.conteudo ~* '(R\$|valor|pix|total|orçamento)'
  AND NOW() - m.enviado_em > INTERVAL '24 hours'
  AND NOT EXISTS (
    SELECT 1 FROM wa_mensagens m2
    WHERE m2.remote_jid = m.remote_jid
      AND m2.enviado_em > m.enviado_em
  )
ORDER BY m.enviado_em ASC
LIMIT 20;
```

**Retorno ao Agente:**
```
Encontrei 3 follow-ups pendentes:

1. Cliente: João Silva (5511999999999)
   Último orçamento: "Fica R$ 450,00 no Pix" (há 26h)
   Sugestão: "Oi João! Você conseguiu ver o orçamento de R$ 450? Posso fechar com você agora 🙂"

2. Cliente: Maria Santos (5511888888888)
   ...
```

---

#### Tool 2: `consultar_base_conhecimento` (Copiloto Técnico)
**Quando usar:** Atendente precisa de resposta técnica

**Funcionamento MVP:**
```javascript
// FAQ em memória (depois vira RAG)
const faq = {
  "dtf": "DTF (Direct to Film) é impressão de alta qualidade...",
  "silk": "Silk screen é ideal para grandes tiragens...",
  "prazo": "Prazo padrão: 7-10 dias úteis após aprovação da arte",
  // ... 20-50 perguntas
};

const match = encontrarMelhorMatch(pergunta, faq);
return match;
```

**Retorno ao Agente:**
```
DTF (Direct to Film) é impressão de alta qualidade com durabilidade superior.
Ideal para designs coloridos e detalhados.
Aplicável em algodão, poliéster e misturas.
```

---

#### Tool 3: `verificar_recompras` (Radar de Recompra)
**Quando usar:** Cron mensal ou atendente pergunta "quais clientes estão perto de recomprar?"

**Funcionamento:**
```sql
SELECT
  p.remote_jid,
  MAX(p.criado_em) AS ultima_compra,
  EXTRACT(MONTH FROM AGE(NOW(), MAX(p.criado_em))) AS meses_desde_compra,
  COUNT(*) AS total_pedidos
FROM producao_pedidos p
WHERE p.status IN ('PRONTO', 'ENTREGUE')
GROUP BY p.remote_jid
HAVING EXTRACT(MONTH FROM AGE(NOW(), MAX(p.criado_em))) >= 11
ORDER BY ultima_compra DESC;
```

**Retorno ao Agente:**
```
3 clientes no radar de recompra:

1. Escola ABC (5511777777777)
   Última compra: 02/2024 (11 meses atrás)
   Histórico: 2 pedidos
   Template: "Oi! Ano passado vocês fizeram com a gente. Já vai ter encomenda esse ano?"

2. ...
```

---

#### Tool 4: `ranking_equipe` (Gamificação)
**Quando usar:** Gestor pergunta "como está o ranking?" ou Cron semanal

**Funcionamento:**
```sql
SELECT
  a.nome,
  COUNT(DISTINCT m.remote_jid) AS conversas_atendidas,
  COUNT(m.id) AS total_mensagens,
  AVG(EXTRACT(EPOCH FROM (primeira_resposta.enviado_em - msg_cliente.enviado_em))/60) AS tempo_primeira_resposta_min,
  COUNT(DISTINCT CASE WHEN c.tags && ARRAY['FECHADO'] THEN c.id END) AS conversas_fechadas
FROM equipe_atendentes a
JOIN wa_mensagens m ON m.atendente_id = a.id
JOIN wa_conversas c ON c.id = m.conversa_id
WHERE m.enviado_em >= NOW() - INTERVAL '7 days'
GROUP BY a.id, a.nome
ORDER BY conversas_fechadas DESC, tempo_primeira_resposta_min ASC;
```

**Retorno ao Agente:**
```
🏆 Ranking Semanal (07/12 - 14/12):

1º Wellington - 45 conversas | Resp: 8min | Fechadas: 32
2º Maria - 38 conversas | Resp: 12min | Fechadas: 28
3º João - 31 conversas | Resp: 15min | Fechadas: 21
```

---

## 🗄️ BANCO DE DADOS

### Estratégia de Migração

**OPÇÃO A: Schema Separado (RECOMENDADO para MVP)**
- Criar novo schema `camaleao_wa` no mesmo banco
- Mantém `oraculo_logs` intacto (legado)
- Novas tabelas: `wa_mensagens`, `wa_conversas`, `wa_alertas`, etc.
- **Vantagem:** Zero risco de quebrar sistema atual
- **Desvantagem:** Duplicação de dados (aceitável no início)

**OPÇÃO B: Unificação Total**
- Renomear `oraculo_logs` para `wa_mensagens_legacy`
- Migrar dados históricos para novo schema
- **Vantagem:** Banco limpo e unificado
- **Desvantagem:** Requer parada e migração

### Recomendação
**Começar com OPÇÃO A**, depois migrar.

---

## 📦 ESTRUTURA DE ARQUIVOS

```
workflows/
├── Oráculo Central (Agente AI).json          ← PRINCIPAL (modificar)
│
├── agente-camaleao-crm/
│   ├── Agente Camaleão CRM.json              ← Já existe (consultas CRM)
│   └── instruções.txt
│
└── agente-camaleao-whatsapp/
    ├── Agente Camaleão WhatsApp.json         ← CRIAR (análise background)
    ├── automacoes-whatsapp-camaleao-v1.2-revisado.md
    ├── camaleao_whatsapp_schema_postgres_v1.2.sql
    └── ARQUITETURA_UNIFICADA.md              ← Este arquivo
```

---

## 🚀 PLANO DE IMPLEMENTAÇÃO (MVP → Completo)

### FASE 1: Fundação (1-2 dias)
**Objetivo:** Registrar tudo, sem análise ainda

- [ ] Executar schema SQL (`camaleao_whatsapp_schema_postgres_v1.2.sql`)
- [ ] Adicionar node "💾 Registro WhatsApp" no Oráculo
  - Grava em `wa_mensagens` (com dedupe por `wa_message_id`)
  - Grava/atualiza em `wa_conversas`
  - Identifica `atendente_id` (se possível pelo telefone/tag)
- [ ] Testar: enviar msg texto/áudio/imagem → verificar gravação no banco
- [ ] Popular tabela `wa_chaves_pix_oficiais` com chaves reais

**Resultado esperado:** Toda mensagem WhatsApp fica registrada no banco novo.

---

### FASE 2: Análise Passiva Crítica (2-3 dias)
**Objetivo:** Alertas de segurança e crise

- [ ] Criar workflow "Agente Camaleão WhatsApp.json" (análise background)
- [ ] Implementar Módulo 1: Anti-Pix
  - Regex para CPF/CNPJ/Email/Tel/Chave aleatória
  - Verificação na allowlist
  - Criar alerta `PIX_SUSPEITO` se não bater
  - Notificar dono via WhatsApp/Email
- [ ] Implementar Módulo 2: Termômetro de Crise
  - Análise de sentimento via OpenAI
  - Lista de palavras-gatilho
  - Criar alerta `CRISE_CLIENTE` se HIGH
  - Tag conversa como `CRISE`
- [ ] Chamar workflow de análise de forma assíncrona (não bloquear resposta)

**Resultado esperado:** Sistema detecta Pix suspeito e clientes em crise.

---

### FASE 3: Produção e Gestão (2-3 dias)
**Objetivo:** Rastrear pedidos e aprovações

- [ ] Implementar Módulo 7: Gestor de Aprovação
  - Detecta envio de arte (imagem/PDF da empresa)
  - Detecta confirmação do cliente
  - Registra em `producao_aprovacoes`
  - Atualiza status em `producao_pedidos`
- [ ] Implementar Módulo 8: Extrator de Grade
  - Prompt OpenAI para extrair JSON estruturado
  - Validação de confidence (> 0.70)
  - Alerta se duvidoso
  - Salva em `producao_pedidos.itens_json`

**Resultado esperado:** Pedidos rastreados com aprovação registrada.

---

### FASE 4: Tools para o Oráculo (3-4 dias)
**Objetivo:** Agente consegue buscar follow-ups, conhecimento, etc.

- [ ] Criar Tool `listar_followups`
  - Query SQL na view `vw_wa_ultima_mensagem_por_conversa`
  - Filtro: fromMe + sem resposta 24h + contém valores
  - Retorna lista formatada para o agente
- [ ] Criar Tool `consultar_base_conhecimento`
  - MVP: FAQ em JSON com 20-50 perguntas
  - Busca por similaridade (embedding ou keyword match)
  - Retorna resposta pronta
- [ ] Criar Tool `verificar_recompras`
  - Query em `producao_pedidos` (última compra >= 11 meses)
  - Retorna clientes + template sugerido
- [ ] Criar Tool `ranking_equipe`
  - Query agregada em `wa_mensagens` + `equipe_atendentes`
  - Métricas: volume, tempo resposta, conversas fechadas
  - Retorna ranking formatado

**Resultado esperado:** Oráculo responde "quais follow-ups tenho?" com dados reais.

---

### FASE 5: Qualidade e Analytics (2-3 dias)
**Objetivo:** Supervisão e métricas

- [ ] Implementar Módulo 5: Supervisor de Qualidade
  - Cron diário (03:00 AM)
  - Pega amostra do dia anterior por atendente
  - Avalia com rubrica 0-10 via OpenAI
  - Gera feedback: 3 pontos + 1 ajuste
  - Envia para atendente/gestor
- [ ] Implementar Módulo 10: Ponto Invisível
  - Registra primeira/última atividade por dia
  - Dashboard de presença (opcional: Grafana)
  - Alerta se atendente sem atividade

**Resultado esperado:** Relatórios de qualidade automáticos.

---

### FASE 6: Otimizações (Contínuo)
**Objetivo:** Reduzir falso-positivo, melhorar precisão

- [ ] Coletar dados de alertas por 7 dias
- [ ] Analisar taxa de falso-positivo
- [ ] Ajustar regex, contexto, thresholds
- [ ] Evoluir FAQ para RAG (vectorstore)
- [ ] Adicionar filtros por contexto (ex: só alerta Pix se msg contém "pix", "pagar", "transferir")

---

## 🔧 MODIFICAÇÕES NO ORÁCULO CENTRAL

### Node NOVO após "Normalizar Dados"

```json
{
  "name": "💾 Registro WhatsApp",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "executeQuery",
    "query": "
      WITH msg_insert AS (
        INSERT INTO wa_mensagens (
          instancia, remote_jid, wa_message_id, is_from_me,
          sender_nome, conteudo, tipo_mensagem, enviado_em, raw_payload
        ) VALUES (
          '{{ $json.instance }}',
          '{{ $json.telefone_whatsapp }}',
          '{{ $json.message_id }}',
          FALSE,
          '{{ $json.nome_cliente }}',
          '{{ $json.mensagem }}',
          '{{ $json.messagetype }}',
          '{{ $json.timestamp }}',
          '{{ JSON.stringify($json) }}'::jsonb
        )
        ON CONFLICT (instancia, wa_message_id) DO NOTHING
        RETURNING id
      ),
      conv_upsert AS (
        INSERT INTO wa_conversas (instancia, remote_jid, ultima_msg_em)
        VALUES ('{{ $json.instance }}', '{{ $json.telefone_whatsapp }}', '{{ $json.timestamp }}')
        ON CONFLICT (instancia, remote_jid)
        DO UPDATE SET ultima_msg_em = EXCLUDED.ultima_msg_em
        RETURNING id
      )
      SELECT
        (SELECT id FROM msg_insert) AS mensagem_id,
        (SELECT id FROM conv_upsert) AS conversa_id;
    "
  }
}
```

### Node NOVO (assíncrono) após "Registro WhatsApp"

```json
{
  "name": "🔍 Análise Background",
  "type": "@n8n/n8n-nodes-langchain.toolWorkflow",
  "parameters": {
    "workflowId": "agente-camaleao-whatsapp",
    "executeOnce": true,
    "waitForExecution": false  // ← NÃO BLOQUEIA
  }
}
```

### Tools NOVOS no "Agente Oráculo"

Adicionar ao lado de "Tool: Meta Ads", "Tool: Suporte", "Tool: Camaleão CRM":

```json
[
  {
    "name": "Tool: Followups WhatsApp",
    "type": "@n8n/n8n-nodes-langchain.toolWorkflow",
    "parameters": {
      "name": "listar_followups",
      "description": "Lista clientes que receberam orçamento mas não responderam em 24h",
      "workflowId": "workflow-followups-id"
    }
  },
  {
    "name": "Tool: Base Conhecimento",
    "type": "@n8n/n8n-nodes-langchain.toolCode",
    "parameters": {
      "name": "consultar_base_conhecimento",
      "description": "Consulta FAQ técnico (DTF, silk, prazos, tecidos, etc)",
      "code": "// FAQ inline ou chamada RAG"
    }
  },
  {
    "name": "Tool: Recompras",
    "type": "@n8n/n8n-nodes-langchain.toolWorkflow",
    "parameters": {
      "name": "verificar_recompras",
      "description": "Identifica clientes que compraram há 11+ meses (recompra sazonal)",
      "workflowId": "workflow-recompras-id"
    }
  },
  {
    "name": "Tool: Ranking",
    "type": "@n8n/n8n-nodes-langchain.toolWorkflow",
    "parameters": {
      "name": "ranking_equipe",
      "description": "Mostra ranking de atendentes (volume, tempo resposta, conversas fechadas)",
      "workflowId": "workflow-ranking-id"
    }
  }
]
```

---

## 🎯 RESULTADO FINAL

### Para o Usuário (Cliente WhatsApp)
- Resposta **instantânea** do Oráculo (não afetado pela análise)
- Agente tem acesso a **mais contexto** (follow-ups, conhecimento técnico, histórico)

### Para o Atendente
- Recebe alertas de **Pix suspeito** em tempo real
- Recebe alertas de **clientes em crise** para priorizar
- Vê lista de **follow-ups pendentes** quando perguntar
- Tem **copiloto técnico** para dúvidas (DTF, silk, prazos)
- Recebe **feedback de qualidade** semanal
- Vê **ranking de performance**

### Para o Gestor
- Dashboard de **alertas não resolvidos**
- Relatório de **qualidade de atendimento**
- **Rastreabilidade total** (quem enviou Pix, quando, prova)
- **Métricas de equipe** (tempo resposta, volume, conversões)
- **Radar de recompra** (não perde clientes sazonais)

---

## ❓ PERGUNTAS PARA DEFINIR

1. **Schema de banco:**
   - Opção A (schema separado `camaleao_wa`) ou
   - Opção B (unificar tudo)?

2. **Identificação de atendentes:**
   - Como saber qual atendente enviou mensagem?
   - Por telefone? Tag na Evolution? Campo no payload?

3. **Notificação de alertas:**
   - Alertas PIX/Crise vão pra onde?
   - WhatsApp do gestor? Email? Telegram?

4. **Chaves Pix oficiais:**
   - Você tem a lista de chaves oficiais da Camaleão?
   - CPF, CNPJ, Email, Tel, Chave aleatória?

5. **Base de conhecimento (FAQ):**
   - Você tem documento com perguntas/respostas técnicas?
   - DTF, silk, prazos, tecidos, valores, políticas?

6. **Priorização do MVP:**
   - Quer começar por qual módulo?
   - Sugestão: Fase 1 → Fase 2 (Anti-Pix + Crise)

---

## 📝 PRÓXIMOS PASSOS

Aguardando sua decisão sobre:
- [ ] Qual estratégia de banco preferir (A ou B)?
- [ ] Como identificar atendentes?
- [ ] Lista de chaves Pix oficiais
- [ ] Por qual fase começar?
- [ ] Alguma mudança na arquitetura proposta?

Depois disso, posso começar a implementação imediatamente!
