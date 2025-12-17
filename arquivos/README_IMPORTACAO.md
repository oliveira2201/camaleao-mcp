# 📥 Importação de Histórico WhatsApp Camaleão

## 🎯 Objetivo
Importar **11.230 mensagens** históricas de 2025 do banco Evolution API para o banco PostgreSQL principal.

## 🔍 Descobertas

### Problema Original
- API Evolution endpoints (`/chat/findMessages`, `/chat/findChats`) retornavam **404**
- Webhook `messages.set` NÃO importou histórico ao re-escanear QR code
- Interface Evolution mostra 3.778 mensagens, mas banco tem muito mais

### Solução Encontrada ✅
**Acesso DIRETO ao banco PostgreSQL da Evolution API**

#### Dados do Banco Evolution:
- **Container**: `gestorconecta_evolution-api-db.1.rjzyu39panvvf9h358r5o3vp2`
- **Host**: 162.240.100.21
- **Porta**: 5432 (interna do Docker)
- **Usuário**: `postgres`
- **Senha**: `20b71a375847654108b2`
- **Database**: `gestorconecta`
- **Tabela principal**: `Message`
- **Total de mensagens Camaleão**: 11.308 (todas) / **11.230** (2025, sem status)

#### Configuração Evolution:
- `DATABASE_SAVE_DATA_HISTORIC=true` ✅ (ativado!)
- `DATABASE_SAVE_IS_ON_WHATSAPP=true` ✅
- Mensagens armazenadas em JSONB com estrutura completa

## 📋 Métodos de Importação

### Opção 1: Script Python (RECOMENDADO) 🐍

**Arquivo**: `importar_historico.py`

**Vantagens**:
- ✅ Importação em lotes (batch_size=500)
- ✅ Dedupe automático (ON CONFLICT DO NOTHING)
- ✅ Progress bar em tempo real
- ✅ Tratamento de erros por mensagem
- ✅ Estatísticas detalhadas
- ✅ Modo teste (100 msgs) ou completo

**Como usar**:
```bash
# 1. Conectar na VPS
ssh -p 22022 root@162.240.100.21

# 2. Instalar psycopg2 (se necessário)
pip3 install psycopg2-binary

# 3. Copiar o script para a VPS
# (fazer upload do arquivo importar_historico.py)

# 4. Executar
python3 importar_historico.py

# 5. Escolher opção:
# - 1: Teste com 100 mensagens
# - 2: Importação completa (11.230 mensagens)
```

**Tempo estimado**: ~5-10 minutos para importação completa

---

### Opção 2: SQL Direto 📝

**Arquivo**: `importar_historico_direto.sql`

**Etapas**:

#### 1. Exportar do Evolution
```bash
docker exec gestorconecta_evolution-api-db.1.rjzyu39panvvf9h358r5o3vp2 psql -U postgres -d gestorconecta -c "COPY (
  [QUERY COMPLETA NO ARQUIVO SQL]
) TO '/tmp/camaleao_historico.csv' WITH (FORMAT CSV, HEADER, DELIMITER E'\t', QUOTE E'\b', ESCAPE E'\b');"
```

#### 2. Importar para banco principal
```bash
PGPASSWORD='1989#Teclado' psql -h localhost -U postgres -d postgres < importar_historico_direto.sql
```

**Vantagens**:
- ✅ Mais rápido (bulk insert)
- ✅ Usa recursos nativos PostgreSQL

**Desvantagens**:
- ❌ Menos feedback de progresso
- ❌ Difícil depuração de erros

---

### Opção 3: Via n8n Workflow ⚙️

**Arquivo**: `Importar Histórico 2025.json`

**Status**: ❌ NÃO FUNCIONA

**Problema**:
- Endpoints `/chat/findMessages` e `/chat/findChats` retornam 404
- Evolution API v2.3.7 não expõe histórico via API REST

**Alternativa possível**:
- Criar custom node n8n que acessa banco PostgreSQL direto
- Não recomendado devido à complexidade

---

## 📊 Estrutura de Dados

### Tabela Evolution `Message`:
```sql
- id (text, PK)
- key (jsonb) → { id, fromMe, remoteJid }
- pushName (varchar)
- messageType (varchar) → conversation, extendedTextMessage, imageMessage, etc.
- message (jsonb) → conteúdo da mensagem
- messageTimestamp (integer) → Unix timestamp
- instanceId (text, FK) → referência à instância
```

### Tabela Principal `wa_mensagens`:
```sql
- id (uuid, PK)
- instancia (text)
- remote_jid (text)
- wa_message_id (text) → vem do Evolution id
- is_from_me (boolean)
- sender_nome (text)
- conteudo (text)
- tipo_mensagem (wa_tipo_mensagem ENUM)
- enviado_em (timestamptz)
- raw_payload (jsonb)
- criado_em (timestamptz)
- UNIQUE (instancia, wa_message_id) → dedupe
```

---

## 🔄 Mapeamento de Tipos

| Evolution messageType | Nosso tipo_mensagem | Extração de conteúdo |
|-----------------------|---------------------|----------------------|
| conversation | text | message→conversation |
| extendedTextMessage | text | message→extendedTextMessage→text |
| imageMessage | image | message→imageMessage→caption ou "[Imagem]" |
| audioMessage | audio | "[Áudio]" |
| videoMessage | video | message→videoMessage→caption ou "[Vídeo]" |
| documentMessage | document | message→documentMessage→fileName ou "[Documento]" |
| stickerMessage | sticker | "[Figurinha]" |
| outros | unknown | "[Mensagem não suportada]" |

---

## ✅ Checklist Pré-Importação

- [x] Banco Evolution acessível
- [x] Banco principal acessível
- [x] Tabelas `wa_mensagens` e `wa_conversas` criadas
- [x] ENUM `wa_tipo_mensagem` criado
- [x] Chaves Pix inseridas
- [x] Workflow entrada funcionando (mensagens novas OK)
- [ ] Backup do banco principal (RECOMENDADO!)

---

## 🚀 Execução Recomendada

### Passo 1: Fazer BACKUP
```bash
ssh -p 22022 root@162.240.100.21
PGPASSWORD='1989#Teclado' pg_dump -h localhost -U postgres -d postgres \
  -t wa_mensagens -t wa_conversas \
  > /root/backup_wa_pre_import_$(date +%Y%m%d_%H%M%S).sql
```

### Passo 2: Teste com 100 mensagens
```bash
python3 importar_historico.py
# Escolher opção 1
```

### Passo 3: Verificar resultados do teste
```bash
PGPASSWORD='1989#Teclado' psql -h localhost -U postgres -d postgres -c \
  "SELECT COUNT(*), MIN(enviado_em), MAX(enviado_em) FROM wa_mensagens WHERE instancia = 'camaleao';"
```

### Passo 4: Importação completa
```bash
python3 importar_historico.py
# Escolher opção 2
```

### Passo 5: Auditoria final
```bash
# Total de mensagens importadas
PGPASSWORD='1989#Teclado' psql -h localhost -U postgres -d postgres -c \
  "SELECT COUNT(*) as total FROM wa_mensagens WHERE instancia = 'camaleao';"

# Mensagens por tipo
PGPASSWORD='1989#Teclado' psql -h localhost -U postgres -d postgres -c \
  "SELECT tipo_mensagem, COUNT(*) FROM wa_mensagens WHERE instancia = 'camaleao' GROUP BY tipo_mensagem ORDER BY COUNT(*) DESC;"

# Top conversas
PGPASSWORD='1989#Teclado' psql -h localhost -U postgres -d postgres -c \
  "SELECT remote_jid, COUNT(*) as total_msgs FROM wa_mensagens WHERE instancia = 'camaleao' GROUP BY remote_jid ORDER BY total_msgs DESC LIMIT 10;"
```

---

## 📚 Fontes

- [Database - Evolution API Documentation](https://doc.evolution-api.com/v2/en/requirements/database)
- [Import messages and contacts with date range · Issue #1278](https://github.com/EvolutionAPI/evolution-api/issues/1278)
- [Find Messages - Evolution API Documentation](https://doc.evolution-api.com/v2/api-reference/chat-controller/find-messages)
- [GET Messages Endpoint for Users and Groups · Issue #924](https://github.com/EvolutionAPI/evolution-api/issues/924)

---

## 🐛 Troubleshooting

### Erro: "connection refused"
- Verificar se está executando **dentro da VPS**
- Banco Evolution só é acessível internamente no Docker

### Erro: "relation Message does not exist"
- Usar aspas duplas: `\"Message\"`
- PostgreSQL é case-sensitive com aspas

### Mensagens duplicadas
- Normal! `ON CONFLICT DO NOTHING` evita duplicação
- Contador de duplicadas mostrará quantas já existiam

### Script Python não encontra psycopg2
```bash
pip3 install psycopg2-binary
# ou
apt install python3-psycopg2
```

---

## ⏱️ Performance

### Teste (100 mensagens):
- Tempo: ~10-15 segundos
- Taxa: ~7 msgs/segundo

### Importação completa (11.230 mensagens):
- Tempo estimado: ~5-10 minutos
- Taxa: ~20-40 msgs/segundo
- Batch size: 500 (ajustável no código)

---

## ✨ Resultado Esperado

Ao final, você terá:
- ✅ **11.230+ mensagens** históricas no banco principal
- ✅ Conversas atualizadas com `ultima_msg_em`
- ✅ Dedupe automático (sem duplicação)
- ✅ Sistema 100% funcional para auditoria
- ✅ Histórico completo desde 01/01/2025

🎉 **Importação de histórico pronta para uso!**
