-- Preenche media_url a partir do raw_payload para mensagens importadas do Evolution
-- Executar no banco principal (PostgresVPS)

UPDATE wa_mensagens
SET media_url = COALESCE(
  raw_payload->'message'->'imageMessage'->>'url',
  raw_payload->'message'->'audioMessage'->>'url',
  raw_payload->'message'->'videoMessage'->>'url',
  raw_payload->'message'->'documentMessage'->>'url'
)
WHERE instancia = 'camaleao'
  AND (media_url IS NULL OR media_url = '')
  AND raw_payload IS NOT NULL;

-- Checar quantos ficaram com media_url preenchido
SELECT tipo_mensagem, COUNT(*) AS total_com_midia
FROM wa_mensagens
WHERE instancia = 'camaleao'
  AND media_url IS NOT NULL
  AND media_url <> ''
GROUP BY tipo_mensagem
ORDER BY total_com_midia DESC;
