-- Importação de teste: 100 mensagens com raw_payload completo
-- Usa abordagem de INSERT direto (sem dblink para Docker)

DO $$
DECLARE
    msg_record RECORD;
    counter INT := 0;
    inserted INT := 0;
    v_tipo wa_tipo_mensagem;
    v_payload jsonb;
    v_media_url text;
    v_conteudo text;
BEGIN
    RAISE NOTICE 'Iniciando importacao de teste (100 mensagens)...';

    -- Este script precisa ser executado APÓS extrair os dados do Docker
    -- Via comando manual ou script auxiliar

    RAISE NOTICE 'AVISO: Este script requer dados pre-extraidos do Docker.';
    RAISE NOTICE 'Use o script import_test_direct.sh para execução completa.';

END $$;

-- Instruções de uso:
-- 1. Execute no VPS: bash import_test_direct.sh
-- 2. Ou extraia manualmente e depois rode este SQL
