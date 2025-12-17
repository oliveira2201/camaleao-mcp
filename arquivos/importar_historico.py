#!/usr/bin/env python3
"""
============================================
IMPORTAÇÃO DE HISTÓRICO WHATSAPP
============================================
Importa mensagens direto do banco Evolution API
para o banco PostgreSQL principal
============================================
"""

import psycopg2
import psycopg2.extras
import json
from datetime import datetime, timezone

# Configuração dos bancos
EVOLUTION_DB = {
    'host': '162.240.100.21',
    'port': 5432,
    'user': 'postgres',
    'password': '20b71a375847654108b2',
    'database': 'gestorconecta',
    'options': '-c search_path=public'
}

MAIN_DB = {
    'host': '162.240.100.21',
    'port': 5432,
    'user': 'postgres',
    'password': '1989#Teclado',
    'database': 'postgres'
}

def conectar_evolution():
    """Conecta ao banco Evolution API"""
    try:
        conn = psycopg2.connect(**EVOLUTION_DB)
        print(f"✓ Conectado ao Evolution DB: {EVOLUTION_DB['database']}")
        return conn
    except Exception as e:
        print(f"✗ Erro ao conectar Evolution DB: {e}")
        raise

def conectar_main():
    """Conecta ao banco principal"""
    try:
        conn = psycopg2.connect(**MAIN_DB)
        print(f"✓ Conectado ao Main DB: {MAIN_DB['database']}")
        return conn
    except Exception as e:
        print(f"✗ Erro ao conectar Main DB: {e}")
        raise

def extrair_mensagens(conn_evolution, limit=None):
    """Extrai mensagens do Evolution API"""
    print("\n📥 Extraindo mensagens do Evolution API...")

    limit_clause = f"LIMIT {limit}" if limit else ""

    query = f"""
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
    FROM "Message"
    WHERE "instanceId" IN (SELECT id FROM "Instance" WHERE name = 'camaleao')
      AND (key->>'remoteJid') NOT LIKE '%@broadcast%'
      AND "messageTimestamp" >= EXTRACT(EPOCH FROM '2025-01-01'::timestamp)::integer
    ORDER BY "messageTimestamp" ASC
    {limit_clause}
    """

    with conn_evolution.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
        cursor.execute(query)
        mensagens = cursor.fetchall()
        print(f"✓ Extraídas {len(mensagens)} mensagens")
        return mensagens

def inserir_mensagens(conn_main, mensagens, batch_size=500):
    """Insere mensagens no banco principal em lotes"""
    print(f"\n💾 Inserindo {len(mensagens)} mensagens no banco principal...")

    inseridas = 0
    duplicadas = 0
    erros = 0

    with conn_main.cursor() as cursor:
        for i in range(0, len(mensagens), batch_size):
            batch = mensagens[i:i+batch_size]

            for msg in batch:
                try:
                    # Limitar tamanho do conteúdo
                    conteudo = (msg['conteudo'] or '')[:5000]

                    # Preparar raw_payload (garantir que seja string JSON válida)
                    raw_payload_str = json.dumps(msg['raw_payload']) if isinstance(msg['raw_payload'], dict) else str(msg['raw_payload'])

                    cursor.execute("""
                        WITH msg_insert AS (
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
                          ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s::wa_tipo_mensagem, %s, %s, %s::jsonb
                          )
                          ON CONFLICT (instancia, wa_message_id) DO NOTHING
                          RETURNING id
                        ),
                        conv_upsert AS (
                          INSERT INTO wa_conversas (instancia, remote_jid, ultima_msg_em)
                          VALUES (%s, %s, %s)
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
                          (SELECT id FROM msg_insert) AS mensagem_id,
                          (SELECT id FROM conv_upsert) AS conversa_id
                    """, (
                        msg['instancia'],
                        msg['remote_jid'],
                        msg['wa_message_id'],
                        msg['is_from_me'],
                        msg['sender_nome'],
                        conteudo,
                        msg['tipo_mensagem'],
                        msg.get('media_url'),
                        msg['enviado_em'],
                        raw_payload_str,
                        msg['instancia'],
                        msg['remote_jid'],
                        msg['enviado_em']
                    ))

                    result = cursor.fetchone()
                    if result and result[0]:  # mensagem_id não é None
                        inseridas += 1
                    else:
                        duplicadas += 1

                except Exception as e:
                    erros += 1
                    print(f"✗ Erro ao inserir mensagem {msg.get('wa_message_id')}: {e}")

            # Commit a cada lote
            conn_main.commit()
            progresso = min(i + batch_size, len(mensagens))
            print(f"  Progresso: {progresso}/{len(mensagens)} ({progresso*100//len(mensagens)}%) - Inseridas: {inseridas}, Duplicadas: {duplicadas}, Erros: {erros}")

    return inseridas, duplicadas, erros

def main():
    """Função principal"""
    print("="*60)
    print("IMPORTAÇÃO DE HISTÓRICO WHATSAPP - CAMALEÃO")
    print("="*60)

    # Perguntar se quer fazer teste ou importação completa
    print("\nOpções:")
    print("1. Teste (100 mensagens)")
    print("2. Importação completa (11.230 mensagens)")
    opcao = input("\nEscolha (1 ou 2): ").strip()

    limit = 100 if opcao == "1" else None

    try:
        # Conectar aos bancos
        conn_evolution = conectar_evolution()
        conn_main = conectar_main()

        # Extrair mensagens
        mensagens = extrair_mensagens(conn_evolution, limit=limit)

        if not mensagens:
            print("⚠️ Nenhuma mensagem encontrada!")
            return

        # Inserir mensagens
        inseridas, duplicadas, erros = inserir_mensagens(conn_main, mensagens)

        # Resumo
        print("\n" + "="*60)
        print("📊 RESUMO DA IMPORTAÇÃO")
        print("="*60)
        print(f"Total processado:  {len(mensagens)}")
        print(f"✓ Inseridas:       {inseridas}")
        print(f"⊘ Duplicadas:      {duplicadas}")
        print(f"✗ Erros:           {erros}")
        print("="*60)

        # Fechar conexões
        conn_evolution.close()
        conn_main.close()

        print("\n✓ Importação concluída!")

    except Exception as e:
        print(f"\n✗ Erro durante importação: {e}")
        raise

if __name__ == "__main__":
    main()
