#!/bin/bash
# Script para importar mensagens do Evolution (Docker) para PostgreSQL principal
# Executa no VPS via SSH

set -e

echo "==================================="
echo "IMPORTAÇÃO WHATSAPP - VIA DOCKER"
echo "==================================="
echo ""

# Passo 1: Extrair dados do Docker e salvar em arquivo temporário
echo "📥 Extraindo dados do Evolution (Docker)..."
docker exec gestorconecta_evolution-api-db.1.rjzyu39panvvf9h358r5o3vp2 psql -U postgres -d gestorconecta -c "\COPY (
    SELECT
        'camaleao' as instancia,
        (key->>'remoteJid') as remote_jid,
        id as wa_message_id,
        (key->>'fromMe')::boolean as is_from_me,
        COALESCE(\"pushName\", CASE WHEN (key->>'fromMe')::boolean THEN 'Camaleao' ELSE 'Cliente' END) as sender_nome,
        CASE
            WHEN \"messageType\" = 'conversation' THEN message->>'conversation'
            WHEN \"messageType\" = 'extendedTextMessage' THEN message->'extendedTextMessage'->>'text'
            WHEN \"messageType\" = 'imageMessage' THEN COALESCE(message->'imageMessage'->>'caption', '[Imagem]')
            WHEN \"messageType\" = 'audioMessage' THEN '[Audio]'
            WHEN \"messageType\" = 'videoMessage' THEN COALESCE(message->'videoMessage'->>'caption', '[Video]'')
            WHEN \"messageType\" = 'documentMessage' THEN COALESCE(message->'documentMessage'->>'fileName', '[Documento]')
            WHEN \"messageType\" = 'stickerMessage' THEN '[Figurinha]'
            ELSE '[Mensagem nao suportada]'
        END as conteudo,
        CASE
            WHEN \"messageType\" IN ('conversation', 'extendedTextMessage') THEN 'text'
            WHEN \"messageType\" = 'imageMessage' THEN 'image'
            WHEN \"messageType\" = 'audioMessage' THEN 'audio'
            WHEN \"messageType\" = 'videoMessage' THEN 'video'
            WHEN \"messageType\" = 'documentMessage' THEN 'document'
            WHEN \"messageType\" = 'stickerMessage' THEN 'sticker'
            ELSE 'unknown'
        END as tipo_mensagem,
        CASE
            WHEN \"messageType\" = 'imageMessage' THEN message->'imageMessage'->>'url'
            WHEN \"messageType\" = 'audioMessage' THEN message->'audioMessage'->>'url'
            WHEN \"messageType\" = 'videoMessage' THEN message->'videoMessage'->>'url'
            WHEN \"messageType\" = 'documentMessage' THEN message->'documentMessage'->>'url'
            ELSE NULL
        END as media_url,
        TO_TIMESTAMP(\"messageTimestamp\") as enviado_em,
        jsonb_build_object(
            'id', id,
            'key', key,
            'pushName', \"pushName\",
            'messageType', \"messageType\",
            'message', message,
            'messageTimestamp', \"messageTimestamp\"
        )::text as raw_payload
    FROM \"Message\"
    WHERE \"instanceId\" IN (SELECT id FROM \"Instance\" WHERE name = 'camaleao')
        AND (key->>'remoteJid') NOT LIKE '%@broadcast%'
        AND \"messageTimestamp\" >= EXTRACT(EPOCH FROM '2025-01-01'::timestamp)::integer
    ORDER BY \"messageTimestamp\" ASC
    LIMIT 100
) TO STDOUT WITH CSV DELIMITER '|' QUOTE '\"' ESCAPE '\\' HEADER" > /tmp/wa_messages_test.csv

echo "✓ Dados extraídos: /tmp/wa_messages_test.csv"
echo ""

# Passo 2: Importar para PostgreSQL principal
echo "💾 Importando para PostgreSQL principal..."
PGPASSWORD='1989#Teclado' psql -h 162.240.100.21 -U postgres -d postgres -c "\COPY wa_mensagens (instancia, remote_jid, wa_message_id, is_from_me, sender_nome, conteudo, tipo_mensagem, media_url, enviado_em, raw_payload) FROM '/tmp/wa_messages_test.csv' WITH CSV DELIMITER '|' QUOTE '\"' ESCAPE '\\' HEADER"

echo "✓ Importação concluída!"
echo ""

# Passo 3: Verificar resultado
echo "📊 Verificando resultado..."
PGPASSWORD='1989#Teclado' psql -h 162.240.100.21 -U postgres -d postgres -c "SELECT COUNT(*) as total FROM wa_mensagens WHERE instancia = 'camaleao';"
PGPASSWORD='1989#Teclado' psql -h 162.240.100.21 -U postgres -d postgres -c "SELECT tipo_mensagem, COUNT(*) FROM wa_mensagens WHERE instancia = 'camaleao' GROUP BY tipo_mensagem;"

echo ""
echo "==================================="
echo "✓ TESTE CONCLUÍDO COM SUCESSO!"
echo "==================================="
