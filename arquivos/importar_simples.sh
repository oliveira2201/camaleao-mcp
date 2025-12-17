#!/bin/bash
# Importação Simples - Histórico WhatsApp Camaleão

echo "=========================================="
echo "IMPORTAÇÃO SIMPLES - HISTÓRICO CAMALEÃO"
echo "=========================================="
echo ""

# Modo
if [ "$1" = "completo" ]; then
  LIMIT=""
  echo "Modo: COMPLETO (11.230 mensagens)"
else
  LIMIT="LIMIT 10"
  echo "Modo: TESTE (10 mensagens)"
fi

echo ""
echo "📥 Extraindo e inserindo mensagens..."
echo ""

# Usar dblink para copiar direto entre bancos
PGPASSWORD='1989#Teclado' psql -h localhost -U postgres -d postgres << 'EOFSQL'

-- Criar extensão dblink se não existir
CREATE EXTENSION IF NOT EXISTS dblink;

-- Inserir mensagens diretamente do banco Evolution
WITH dados_evolution AS (
  SELECT * FROM dblink(
    'host=gestorconecta_evolution-api-db port=5432 dbname=gestorconecta user=postgres password=20b71a375847654108b2',
    $$
    SELECT
      'camaleao' AS instancia,
      (key->>'remoteJid') AS remote_jid,
      id AS wa_message_id,
      (key->>'fromMe')::boolean AS is_from_me,
      COALESCE("pushName", CASE WHEN (key->>'fromMe')::boolean THEN 'Camaleão' ELSE 'Cliente' END) AS sender_nome,
      CASE
        WHEN "messageType" = 'conversation' THEN message->>'conversation'
        WHEN "messageType" = 'extendedTextMessage' THEN message->'extendedTextMessage'->>'text'
        WHEN "messageType" = 'imageMessage' THEN COALESCE(message->'imageMessage'->>'caption', '[Imagem]')
        WHEN "messageType" = 'audioMessage' THEN '[Áudio]'
        WHEN "messageType" = 'videoMessage' THEN COALESCE(message->'videoMessage'->>'caption', '[Vídeo]')
        WHEN "messageType" = 'documentMessage' THEN COALESCE(message->'documentMessage'->>'fileName', '[Documento]')
        WHEN "messageType" = 'stickerMessage' THEN '[Figurinha]'
        ELSE '[Mensagem não suportada]'
      END AS conteudo,
      CASE
        WHEN "messageType" IN ('conversation', 'extendedTextMessage') THEN 'text'
        WHEN "messageType" = 'imageMessage' THEN 'image'
        WHEN "messageType" = 'audioMessage' THEN 'audio'
        WHEN "messageType" = 'videoMessage' THEN 'video'
        WHEN "messageType" = 'documentMessage' THEN 'document'
        WHEN "messageType" = 'stickerMessage' THEN 'sticker'
        ELSE 'unknown'
      END AS tipo_mensagem,
      TO_TIMESTAMP("messageTimestamp") AS enviado_em
    FROM "Message"
    WHERE "instanceId" IN (SELECT id FROM "Instance" WHERE name = 'camaleao')
      AND (key->>'remoteJid') NOT LIKE '%@broadcast%'
      AND "messageTimestamp" >= EXTRACT(EPOCH FROM '2025-01-01'::timestamp)::integer
    ORDER BY "messageTimestamp" ASC
    $$
  ) AS t(
    instancia text,
    remote_jid text,
    wa_message_id text,
    is_from_me boolean,
    sender_nome text,
    conteudo text,
    tipo_mensagem text,
    enviado_em timestamp with time zone
  )
),
msg_insert AS (
  INSERT INTO wa_mensagens (
    instancia,
    remote_jid,
    wa_message_id,
    is_from_me,
    sender_nome,
    conteudo,
    tipo_mensagem,
    enviado_em
  )
  SELECT
    instancia,
    remote_jid,
    wa_message_id,
    is_from_me,
    sender_nome,
    LEFT(conteudo, 5000),
    tipo_mensagem::wa_tipo_mensagem,
    enviado_em
  FROM dados_evolution
  ON CONFLICT (instancia, wa_message_id) DO NOTHING
  RETURNING id, remote_jid, enviado_em
),
conv_upsert AS (
  INSERT INTO wa_conversas (instancia, remote_jid, ultima_msg_em)
  SELECT DISTINCT
    'camaleao',
    remote_jid,
    MAX(enviado_em)
  FROM msg_insert
  GROUP BY remote_jid
  ON CONFLICT (instancia, remote_jid)
  DO UPDATE SET
    ultima_msg_em = CASE
      WHEN wa_conversas.ultima_msg_em < EXCLUDED.ultima_msg_em
      THEN EXCLUDED.ultima_msg_em
      ELSE wa_conversas.ultima_msg_em
    END,
    atualizado_em = NOW()
  RETURNING id
)
SELECT
  (SELECT COUNT(*) FROM msg_insert) AS mensagens_inseridas,
  (SELECT COUNT(*) FROM conv_upsert) AS conversas_atualizadas,
  (SELECT COUNT(*) FROM dados_evolution) AS total_processado;

-- Mostrar estatísticas finais
\echo ''
\echo '=========================================='
\echo '📊 ESTATÍSTICAS FINAIS'
\echo '=========================================='

SELECT
  COUNT(*) as total_mensagens,
  MIN(enviado_em) as primeira_mensagem,
  MAX(enviado_em) as ultima_mensagem
FROM wa_mensagens
WHERE instancia = 'camaleao';

\echo ''
\echo '✓ Importação concluída!'

EOFSQL
