# 📊 RELATÓRIO COMPLETO - BANCO DE DADOS POSTGRESQL

**Banco:** `postgres`
**Host:** 162.240.100.21:5432
**Data do Relatório:** 15/12/2025

---

## 📋 RESUMO EXECUTIVO

- **Total de Tabelas:** 16
- **Tamanho Total do Banco:** ~122 MB
- **Maior Tabela:** `banco_de_cnpjs` (119 MB, 353.400 registros)
- **Tabelas em Uso Ativo:** 6
- **Tabelas Vazias:** 5

---

## 📊 TABELAS E ESTATÍSTICAS

### Tabelas do Sistema Principal

| Tabela | Registros | Tamanho | Descrição |
|--------|-----------|---------|-----------|
| `banco_de_cnpjs` | 353.400 | 119 MB | Base de dados de CNPJs |
| `empresa` | 5 | 48 kB | Cadastro de empresas |
| `usuario` | 3 | 80 kB | Usuários do sistema |
| `assinaturacliente` | 3 | 96 kB | Assinaturas de clientes |
| `planoprecificacao` | 3 | 48 kB | Planos de precificação |
| `produtoprecificado` | 3 | 64 kB | Produtos precificados |

### Tabelas do Oráculo (Sistema de Roteamento IA)

| Tabela | Registros | Tamanho | Descrição |
|--------|-----------|---------|-----------|
| `oraculo_logs` | 325 | 168 kB | Logs de interações do Oráculo |
| `oraculo_rotas` | 3 | 32 kB | Rotas de redirecionamento |
| `oraculo_sessoes` | 0 | 16 kB | Sessões ativas (vazio) |

**Análise do oraculo_logs:**
- ✅ 325 interações registradas
- 👥 3 clientes únicos
- 🤖 2 agentes diferentes utilizados
- 📅 Período: 10/12/2025 - 15/12/2025 (5 dias)

### Tabelas WhatsApp (Sistema de Mensagens)

| Tabela | Registros | Tamanho | Descrição |
|--------|-----------|---------|-----------|
| `wa_mensagens` | 100 | 2.6 MB | Mensagens WhatsApp (TESTE) |
| `wa_conversas` | 0 | 64 kB | Conversas WhatsApp (vazio) |
| `wa_alertas` | 0 | 32 kB | Alertas automáticos (vazio) |
| `wa_chaves_pix_oficiais` | 2 | 48 kB | Chaves PIX cadastradas |

**Análise detalhada de wa_mensagens:**
- ⚠️ **100 mensagens de TESTE** (instância: camaleao)
- 📊 Distribuição:
  - 📝 Texto: 55 (55%)
  - 🎤 Áudio: 23 (23%)
  - 🖼️ Imagem: 22 (22%)
  - 🎥 Vídeo: 0
  - 📄 Documento: 0
- 📤 Enviadas: 40 (40%)
- 📥 Recebidas: 60 (60%)
- 📅 Período: 03/06/2025 - 16/09/2025

### Tabelas de Produção

| Tabela | Registros | Tamanho | Descrição |
|--------|-----------|---------|-----------|
| `producao_pedidos` | 0 | 32 kB | Pedidos de produção (vazio) |
| `producao_aprovacoes` | 0 | 24 kB | Aprovações (vazio) |
| `equipe_atendentes` | 0 | 16 kB | Cadastro de atendentes (vazio) |

---

## 🔧 ESTRUTURAS PERSONALIZADAS

### ENUM Types (Tipos Enumerados)

#### `wa_tipo_mensagem`
Valores aceitos:
- `text` - Mensagem de texto
- `image` - Imagem
- `audio` - Áudio/voz
- `video` - Vídeo
- `document` - Documento
- `sticker` - Figurinha
- `unknown` - Tipo desconhecido

#### `wa_tipo_alerta`
Valores aceitos:
- `PIX_SUSPEITO` - Chave PIX suspeita detectada
- `CRISE_CLIENTE` - Cliente insatisfeito/crise
- `SLA_ATRASO` - Atraso no SLA de atendimento
- `FOLLOWUP_SUGERIDO` - Sugestão de follow-up
- `QUALIDADE_BAIXA` - Qualidade baixa no atendimento
- `APROVACAO_REGISTRADA` - Aprovação registrada

#### `wa_severidade_alerta`
Valores aceitos:
- `LOW` - Baixa prioridade
- `MEDIUM` - Média prioridade
- `HIGH` - Alta prioridade

---

## 📝 ESTRUTURA DETALHADA: wa_mensagens

### Colunas

| Coluna | Tipo | Obrigatório | Padrão | Descrição |
|--------|------|-------------|--------|-----------|
| `id` | UUID | Sim | auto | ID único da mensagem |
| `instancia` | TEXT | Sim | - | Nome da instância WhatsApp |
| `remote_jid` | TEXT | Sim | - | ID do contato (telefone@s.whatsapp.net) |
| `wa_message_id` | TEXT | Sim | - | ID único da mensagem no WhatsApp |
| `is_from_me` | BOOLEAN | Sim | - | True se enviada, False se recebida |
| `atendente_id` | UUID | Não | NULL | FK para equipe_atendentes |
| `sender_nome` | TEXT | Sim | 'CLIENTE' | Nome do remetente |
| `conteudo` | TEXT | Não | NULL | Texto da mensagem |
| `tipo_mensagem` | wa_tipo_mensagem | Sim | 'unknown' | Tipo da mensagem |
| `media_url` | TEXT | Não | NULL | URL da mídia (imagem/áudio/etc) |
| `enviado_em` | TIMESTAMPTZ | Sim | - | Data/hora de envio |
| `raw_payload` | JSONB | Sim | '{}' | Payload completo da Evolution API |
| `criado_em` | TIMESTAMPTZ | Sim | now() | Data/hora de criação do registro |

### Índices
- ✅ `wa_mensagens_pkey` (PRIMARY KEY) - id
- ✅ `uq_wa_mensagens_dedupe` (UNIQUE) - instancia + wa_message_id (evita duplicação)
- ✅ `idx_wa_mensagens_enviado_em` - enviado_em DESC (otimiza busca por data)
- ✅ `idx_wa_mensagens_from_me` - is_from_me (filtra enviadas/recebidas)
- ✅ `idx_wa_mensagens_remote_jid` - remote_jid (busca por contato)

### Relacionamentos
- **FK:** `atendente_id` → `equipe_atendentes(id)`
- **Referenciada por:**
  - `producao_aprovacoes.mensagem_id`
  - `wa_alertas.mensagem_id`

---

## 📝 ESTRUTURA DETALHADA: wa_conversas

### Colunas

| Coluna | Tipo | Obrigatório | Padrão | Descrição |
|--------|------|-------------|--------|-----------|
| `id` | UUID | Sim | auto | ID único da conversa |
| `remote_jid` | TEXT | Sim | - | ID do contato |
| `instancia` | TEXT | Sim | - | Nome da instância |
| `atendente_id` | UUID | Não | NULL | FK para atendente responsável |
| `status` | TEXT | Não | NULL | Status da conversa |
| `tags` | TEXT[] | Sim | '{}' | Array de tags |
| `ultima_msg_em` | TIMESTAMPTZ | Não | NULL | Data da última mensagem |
| `criado_em` | TIMESTAMPTZ | Sim | now() | Criação do registro |
| `atualizado_em` | TIMESTAMPTZ | Sim | now() | Última atualização |

### Índices
- ✅ `wa_conversas_pkey` (PRIMARY KEY) - id
- ✅ `uq_wa_conversas` (UNIQUE) - instancia + remote_jid
- ✅ `idx_wa_conversas_ultima_msg_em` - ultima_msg_em DESC

### Triggers
- ✅ `trg_touch_wa_conversas` - Atualiza `atualizado_em` automaticamente

### Relacionamentos
- **FK:** `atendente_id` → `equipe_atendentes(id)`
- **Referenciada por:**
  - `producao_pedidos.conversa_id`
  - `wa_alertas.conversa_id`

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 1. **100 Mensagens de Teste na Produção**
- ❌ Tabela `wa_mensagens` contém 100 mensagens de teste
- ❌ Tabela `wa_conversas` está vazia (deveria ter sido populada)
- 📅 Mensagens são de Jun-Set/2025 (período de teste)
- ⚠️ **Recomendação:** Deletar mensagens de teste antes de colocar em produção

### 2. **Workflow N8N com Erro de Cast**
- ❌ Workflow "Camaleão WhatsApp - Entrada" retorna erro:
  ```
  column "tipo_mensagem" is of type wa_tipo_mensagem but expression is of type text
  ```
- ✅ **Causa identificada:** Query tem o cast correto (`::wa_tipo_mensagem`)
- ⚠️ **Possível causa:** Valor de `$json.messagetype` está NULL ou não bate com nenhum CASE
- ✅ **Solução:** Adicionar log de debug para ver valor de `messagetype`

### 3. **Tabela wa_conversas Vazia**
- ❌ Apesar de 100 mensagens, `wa_conversas` tem 0 registros
- ⚠️ **Possível causa:** Script de importação de teste não populou conversas
- ✅ **Impacto:** Baixo (conversas serão criadas em produção pelo workflow)

### 4. **Tabelas Vazias mas Esperadas**
- `equipe_atendentes` - 0 registros (atendentes ainda não cadastrados)
- `wa_alertas` - 0 registros (sistema de alertas não ativo)
- `producao_pedidos` - 0 registros (sem pedidos ainda)
- `producao_aprovacoes` - 0 registros (sem aprovações ainda)

---

## ✅ PONTOS POSITIVOS

1. ✅ **Estrutura do Banco Correta**
   - Todas as tabelas criadas corretamente
   - ENUMs definidos com valores corretos
   - Índices otimizados para performance
   - Foreign Keys configuradas

2. ✅ **Sistema de Deduplicação Ativo**
   - `uq_wa_mensagens_dedupe` evita mensagens duplicadas
   - `uq_wa_conversas` evita conversas duplicadas

3. ✅ **Oráculo Funcionando**
   - 325 logs registrados nos últimos 5 dias
   - Sistema ativo e processando mensagens

4. ✅ **Base de CNPJs Populada**
   - 353.400 CNPJs cadastrados
   - Maior tabela do banco (119 MB)

---

## 📋 RECOMENDAÇÕES

### Imediatas

1. **Limpar Dados de Teste**
   ```sql
   DELETE FROM wa_mensagens WHERE instancia = 'camaleao';
   DELETE FROM wa_conversas WHERE instancia = 'camaleao';
   ```

2. **Testar Workflow com Mensagem Real**
   - Enviar mensagem de teste pelo WhatsApp
   - Verificar se INSERT funciona corretamente
   - Confirmar que `tipo_mensagem` está sendo preenchido

3. **Cadastrar Atendentes**
   - Popular tabela `equipe_atendentes`
   - Permitir atribuição de conversas

### Médio Prazo

4. **Monitorar Crescimento da Tabela wa_mensagens**
   - Atual: 2.6 MB (100 msgs)
   - Projeção: ~26 MB para 1.000 mensagens
   - Considerar particionamento se passar de 1 milhão de mensagens

5. **Implementar Backup Automático**
   - Backup diário do banco PostgreSQL
   - Retenção de 30 dias

6. **Adicionar Logs de Debug no N8N**
   - Capturar valor de `$json.messagetype` antes do INSERT
   - Facilitar troubleshooting de erros futuros

---

## 📊 MÉTRICAS DE USO

### Período Analisado: Últimos 5 Dias (10-15 Dez/2025)

| Métrica | Valor |
|---------|-------|
| Interações Oráculo | 325 |
| Clientes Únicos | 3 |
| Mensagens WhatsApp | 100 (teste) |
| Conversas Ativas | 0 |
| Alertas Gerados | 0 |
| Pedidos Criados | 0 |

---

## 🔍 QUERIES ÚTEIS

### Buscar Mensagens de um Contato
```sql
SELECT * FROM wa_mensagens
WHERE remote_jid = '558981278340@s.whatsapp.net'
ORDER BY enviado_em DESC;
```

### Ver Últimas Interações do Oráculo
```sql
SELECT criado_em, telefone_cliente, agente_escolhido, acao
FROM oraculo_logs
ORDER BY criado_em DESC
LIMIT 20;
```

### Estatísticas de Mensagens por Dia
```sql
SELECT
  DATE(enviado_em) as data,
  COUNT(*) as total,
  COUNT(CASE WHEN is_from_me THEN 1 END) as enviadas,
  COUNT(CASE WHEN NOT is_from_me THEN 1 END) as recebidas
FROM wa_mensagens
GROUP BY DATE(enviado_em)
ORDER BY data DESC;
```

---

**Fim do Relatório**
