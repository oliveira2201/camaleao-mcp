-- Reimportacao com raw_payload completo - TESTE 100 mensagens - FIXED TYPE CAST

CREATE EXTENSION IF NOT EXISTS dblink;

INSERT INTO wa_mensagens (
    instancia,
    remote_jid,
    wa_message_id,
    is_from_me,
    sender_nome,
    conteudo,
    tipo_mensagem,
    media_url,
    enviado_em,
    raw_payload
)
SELECT
    'camaleao' AS instancia,
    (key->>'remoteJid') AS remote_jid,
    id AS wa_message_id,
    (key->>'fromMe')::boolean AS is_from_me,
    COALESCE("pushName", CASE WHEN (key->>'fromMe')::boolean THEN 'Camaleao' ELSE 'Cliente' END) AS sender_nome,
    CASE
        WHEN "messageType" = 'conversation' THEN message->>'conversation'
        WHEN "messageType" = 'extendedTextMessage' THEN message->'extendedTextMessage'->>'text'
        WHEN "messageType" = 'imageMessage' THEN COALESCE(message->'imageMessage'->>'caption', '[Imagem]')
        WHEN "messageType" = 'audioMessage' THEN '[Audio]'
        WHEN "messageType" = 'videoMessage' THEN COALESCE(message->'videoMessage'->>'caption', '[Video]')
        WHEN "messageType" = 'documentMessage' THEN COALESCE(message->'documentMessage'->>'fileName', '[Documento]')
        WHEN "messageType" = 'stickerMessage' THEN '[Figurinha]'
        ELSE '[Mensagem nao suportada]'
    END AS conteudo,
    (CASE
        WHEN "messageType" IN ('conversation', 'extendedTextMessage') THEN 'text'
        WHEN "messageType" = 'imageMessage' THEN 'image'
        WHEN "messageType" = 'audioMessage' THEN 'audio'
        WHEN "messageType" = 'videoMessage' THEN 'video'
        WHEN "messageType" = 'documentMessage' THEN 'document'
        WHEN "messageType" = 'stickerMessage' THEN 'sticker'
        ELSE 'unknown'
    END)::wa_tipo_mensagem AS tipo_mensagem,
    CASE
        WHEN "messageType" = 'imageMessage' THEN message->'imageMessage'->>'url'
        WHEN "messageType" = 'audioMessage' THEN message->'audioMessage'->>'url'
        WHEN "messageType" = 'videoMessage' THEN message->'videoMessage'->>'url'
        WHEN "messageType" = 'documentMessage' THEN message->'documentMessage'->>'url'
        ELSE NULL
    END AS media_url,
    TO_TIMESTAMP("messageTimestamp") AT TIME ZONE 'UTC' AS enviado_em,
    jsonb_build_object(
        'id', id,
        'key', key,
        'pushName', "pushName",
        'messageType', "messageType",
        'message', message,
        'messageTimestamp', "messageTimestamp"
    ) AS raw_payload
FROM dblink(
    'host=162.240.100.21 port=5432 dbname=gestorconecta user=postgres password=20b71a375847654108b2',
    'SELECT id, key, "pushName", "messageType", message, "messageTimestamp" FROM "Message" WHERE "instanceId" IN (SELECT id FROM "Instance" WHERE name = ''camaleao'') AND (key->>''remoteJid'') NOT LIKE ''%@broadcast%'' AND "messageTimestamp" >= EXTRACT(EPOCH FROM ''2025-01-01''::timestamp)::integer ORDER BY "messageTimestamp" ASC LIMIT 100'
) AS t(
    id text,
    key jsonb,
    "pushName" text,
    "messageType" text,
    message jsonb,
    "messageTimestamp" integer
)
ON CONFLICT (instancia, wa_message_id) DO NOTHING;

SELECT COUNT(*) as mensagens_inseridas FROM wa_mensagens WHERE instancia = 'camaleao';

SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN raw_payload IS NOT NULL AND jsonb_typeof(raw_payload) != 'null' THEN 1 END) as com_payload,
    COUNT(CASE WHEN media_url IS NOT NULL THEN 1 END) as com_media_url
FROM wa_mensagens WHERE instancia = 'camaleao';
