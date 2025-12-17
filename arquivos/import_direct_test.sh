#!/bin/bash
# Importação direta: Docker Evolution -> PostgreSQL Principal
# TESTE: 100 mensagens

echo "==========================================="
echo "IMPORTAÇÃO TESTE - 100 MENSAGENS"
echo "==========================================="
echo ""

# Gerar INSERTs diretamente do Docker e executar no PostgreSQL principal
docker exec gestorconecta_evolution-api-db.1.rjzyu39panvvf9h358r5o3vp2 psql -U postgres -d gestorconecta -t -A -c "
SELECT
    'INSERT INTO wa_mensagens (instancia, remote_jid, wa_message_id, is_from_me, sender_nome, conteudo, tipo_mensagem, media_url, enviado_em, raw_payload) VALUES (' ||
    quote_literal('camaleao') || ', ' ||
    quote_literal(key->>'remoteJid') || ', ' ||
    quote_literal(id) || ', ' ||
    (key->>'fromMe')::boolean || ', ' ||
    quote_literal(COALESCE(\"pushName\", CASE WHEN (key->>'fromMe')::boolean THEN 'Camaleao' ELSE 'Cliente' END)) || ', ' ||
    quote_literal(CASE
        WHEN \"messageType\" = 'conversation' THEN message->>'conversation'
        WHEN \"messageType\" = 'extendedTextMessage' THEN message->'extendedTextMessage'->>'text'
        WHEN \"messageType\" = 'imageMessage' THEN COALESCE(message->'imageMessage'->>'caption', '[Imagem]')
        WHEN \"messageType\" = 'audioMessage' THEN '[Audio]'
        WHEN \"messageType\" = 'videoMessage' THEN COALESCE(message->'videoMessage'->>'caption', '[Video]')
        WHEN \"messageType\" = 'documentMessage' THEN COALESCE(message->'documentMessage'->>'fileName', '[Documento]')
        WHEN \"messageType\" = 'stickerMessage' THEN '[Figurinha]'
        ELSE '[Mensagem nao suportada]'
    END) || ', ' ||
    quote_literal(CASE
        WHEN \"messageType\" IN ('conversation', 'extendedTextMessage') THEN 'text'
        WHEN \"messageType\" = 'imageMessage' THEN 'image'
        WHEN \"messageType\" = 'audioMessage' THEN 'audio'
        WHEN \"messageType\" = 'videoMessage' THEN 'video'
        WHEN \"messageType\" = 'documentMessage' THEN 'document'
        WHEN \"messageType\" = 'stickerMessage' THEN 'sticker'
        ELSE 'unknown'
    END) || '::wa_tipo_mensagem, ' ||
    COALESCE(quote_literal(CASE
        WHEN \"messageType\" = 'imageMessage' THEN message->'imageMessage'->>'url'
        WHEN \"messageType\" = 'audioMessage' THEN message->'audioMessage'->>'url'
        WHEN \"messageType\" = 'videoMessage' THEN message->'videoMessage'->>'url'
        WHEN \"messageType\" = 'documentMessage' THEN message->'documentMessage'->>'url'
    END), 'NULL') || ', ' ||
    quote_literal(TO_TIMESTAMP(\"messageTimestamp\")::text) || '::timestamptz, ' ||
    quote_literal(jsonb_build_object(
        'id', id,
        'key', key,
        'pushName', \"pushName\",
        'messageType', \"messageType\",
        'message', message,
        'messageTimestamp', \"messageTimestamp\"
    )::text) || '::jsonb) ON CONFLICT (instancia, wa_message_id) DO NOTHING;' as insert_stmt
FROM \"Message\"
WHERE \"instanceId\" IN (SELECT id FROM \"Instance\" WHERE name = 'camaleao')
    AND (key->>'remoteJid') NOT LIKE '%@broadcast%'
    AND \"messageTimestamp\" >= EXTRACT(EPOCH FROM '2025-01-01'::timestamp)::integer
ORDER BY \"messageTimestamp\" ASC
LIMIT 100
" | PGPASSWORD='1989#Teclado' psql -h 162.240.100.21 -U postgres -d postgres

echo ""
echo "✓ Importação concluída!"
echo ""
echo "📊 Verificando resultado..."
PGPASSWORD='1989#Teclado' psql -h 162.240.100.21 -U postgres -d postgres -c "
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN jsonb_typeof(raw_payload) != 'null' AND raw_payload != '{}'::jsonb THEN 1 END) as com_payload,
    COUNT(CASE WHEN media_url IS NOT NULL THEN 1 END) as com_media_url
FROM wa_mensagens WHERE instancia = 'camaleao';
"

echo ""
echo "==========================================="
