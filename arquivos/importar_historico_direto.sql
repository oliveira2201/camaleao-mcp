-- ============================================
-- IMPORTAÇÃO DIRETA DO HISTÓRICO
-- ============================================
-- Importa mensagens direto do banco Evolution API
-- para o banco PostgreSQL do nosso sistema
-- ============================================

-- EXECUTAR NA VPS:
-- 1. Conectar ao banco Evolution
-- 2. Copiar mensagens para arquivo temporário
-- 3. Conectar ao banco principal
-- 4. Importar do arquivo

-- PASSO 1: Extrair mensagens do Evolution API (executar NA VPS)
-- docker exec gestorconecta_evolution-api-db.1.rjzyu39panvvf9h358r5o3vp2 psql -U postgres -d gestorconecta -c "COPY (
WITH instance_data AS (
  SELECT id FROM \"Instance\" WHERE name = 'camaleao'
)
SELECT
  'camaleao'::text AS instancia,
  (key->>'remoteJid')::text AS remote_jid,
  id::text AS wa_message_id,
  (key->>'fromMe')::boolean AS is_from_me,
  COALESCE(\"pushName\", CASE WHEN (key->>'fromMe')::boolean THEN 'Camaleão' ELSE 'Cliente' END) AS sender_nome,
  CASE
    WHEN \"messageType\" = 'conversation' THEN message->>'conversation'
    WHEN \"messageType\" = 'extendedTextMessage' THEN message->'extendedTextMessage'->>'text'
    WHEN \"messageType\" = 'imageMessage' THEN COALESCE(message->'imageMessage'->>'caption', '[Imagem]')
    WHEN \"messageType\" = 'audioMessage' THEN '[Áudio]'
    WHEN \"messageType\" = 'videoMessage' THEN COALESCE(message->'videoMessage'->>'caption', '[Vídeo]')
    WHEN \"messageType\" = 'documentMessage' THEN COALESCE(message->'documentMessage'->>'fileName', '[Documento]')
    WHEN \"messageType\" = 'stickerMessage' THEN '[Figurinha]'
    ELSE '[Mensagem não suportada]'
  END AS conteudo,
  CASE
    WHEN \"messageType\" IN ('conversation', 'extendedTextMessage') THEN 'text'
    WHEN \"messageType\" = 'imageMessage' THEN 'image'
    WHEN \"messageType\" = 'audioMessage' THEN 'audio'
    WHEN \"messageType\" = 'videoMessage' THEN 'video'
    WHEN \"messageType\" = 'documentMessage' THEN 'document'
    WHEN \"messageType\" = 'stickerMessage' THEN 'sticker'
    ELSE 'unknown'
  END AS tipo_mensagem,
  TO_TIMESTAMP(\"messageTimestamp\") AT TIME ZONE 'UTC' AS enviado_em,
  jsonb_build_object(
    'id', id,
    'key', key,
    'pushName', \"pushName\",
    'messageType', \"messageType\",
    'message', message,
    'messageTimestamp', \"messageTimestamp\"
  ) AS raw_payload
FROM \"Message\"
WHERE \"instanceId\" IN (SELECT id FROM instance_data)
  AND (key->>'remoteJid') NOT LIKE '%@broadcast%'  -- Excluir status
  AND \"messageTimestamp\" >= EXTRACT(EPOCH FROM '2025-01-01'::timestamp)::integer  -- Apenas 2025+
ORDER BY \"messageTimestamp\" DESC
) TO '/tmp/camaleao_historico.csv' WITH (FORMAT CSV, HEADER, DELIMITER E'\t', QUOTE E'\b', ESCAPE E'\b');"

-- PASSO 2: Importar para o banco principal (executar no banco principal)
-- Criar tabela temporária
DROP TABLE IF EXISTS temp_historico_import;
CREATE TEMP TABLE temp_historico_import (
  instancia TEXT,
  remote_jid TEXT,
  wa_message_id TEXT,
  is_from_me BOOLEAN,
  sender_nome TEXT,
  conteudo TEXT,
  tipo_mensagem TEXT,
  enviado_em TIMESTAMP WITH TIME ZONE,
  raw_payload JSONB
);

-- Copiar do arquivo
COPY temp_historico_import FROM '/tmp/camaleao_historico.csv' WITH (FORMAT CSV, HEADER, DELIMITER E'\t', QUOTE E'\b', ESCAPE E'\b');

-- Inserir no banco com dedupe
WITH msg_insert AS (
  INSERT INTO wa_mensagens (
    instancia,
    remote_jid,
    wa_message_id,
    is_from_me,
    sender_nome,
    conteudo,
    tipo_mensagem,
    enviado_em,
    raw_payload
  )
  SELECT
    instancia,
    remote_jid,
    wa_message_id,
    is_from_me,
    sender_nome,
    LEFT(conteudo, 5000),  -- Limitar tamanho
    tipo_mensagem::wa_tipo_mensagem,
    enviado_em,
    raw_payload
  FROM temp_historico_import
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
  (SELECT COUNT(*) FROM temp_historico_import) AS total_processado;

-- Limpar
DROP TABLE temp_historico_import;
