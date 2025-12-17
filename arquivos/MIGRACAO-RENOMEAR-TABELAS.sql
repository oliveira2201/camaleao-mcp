-- =====================================================
-- MIGRAÇÃO: RENOMEAR TABELAS WA_* PARA ORACULO_*
-- =====================================================
-- Data: 15/12/2025
-- Motivo: Padronizar nomenclatura - Oráculo Central usa essas tabelas
-- Tabelas afetadas: wa_mensagens, wa_conversas
-- =====================================================

-- IMPORTANTE: Execute este script em TRANSAÇÃO
BEGIN;

-- =====================================================
-- PASSO 1: RENOMEAR TABELAS
-- =====================================================

-- 1.1 Renomear wa_mensagens → oraculo_mensagens
ALTER TABLE wa_mensagens RENAME TO oraculo_mensagens;

-- 1.2 Renomear wa_conversas → oraculo_conversas
ALTER TABLE wa_conversas RENAME TO oraculo_conversas;

-- =====================================================
-- PASSO 2: RENOMEAR CONSTRAINTS (PKs, UKs, FKs)
-- =====================================================

-- 2.1 PRIMARY KEYS
ALTER TABLE oraculo_mensagens RENAME CONSTRAINT wa_mensagens_pkey TO oraculo_mensagens_pkey;
ALTER TABLE oraculo_conversas RENAME CONSTRAINT wa_conversas_pkey TO oraculo_conversas_pkey;

-- 2.2 UNIQUE CONSTRAINTS (Dedupe)
ALTER TABLE oraculo_mensagens RENAME CONSTRAINT uq_wa_mensagens_dedupe TO uq_oraculo_mensagens_dedupe;
ALTER TABLE oraculo_conversas RENAME CONSTRAINT uq_wa_conversas TO uq_oraculo_conversas;

-- 2.3 FOREIGN KEYS
ALTER TABLE oraculo_mensagens RENAME CONSTRAINT wa_mensagens_atendente_id_fkey TO oraculo_mensagens_atendente_id_fkey;
ALTER TABLE oraculo_conversas RENAME CONSTRAINT wa_conversas_atendente_id_fkey TO oraculo_conversas_atendente_id_fkey;

-- =====================================================
-- PASSO 3: RENOMEAR ÍNDICES
-- =====================================================

-- 3.1 Índices de oraculo_mensagens
ALTER INDEX idx_wa_mensagens_enviado_em RENAME TO idx_oraculo_mensagens_enviado_em;
ALTER INDEX idx_wa_mensagens_from_me RENAME TO idx_oraculo_mensagens_from_me;
ALTER INDEX idx_wa_mensagens_remote_jid RENAME TO idx_oraculo_mensagens_remote_jid;

-- 3.2 Índices de oraculo_conversas
ALTER INDEX idx_wa_conversas_ultima_msg_em RENAME TO idx_oraculo_conversas_ultima_msg_em;

-- =====================================================
-- PASSO 4: RENOMEAR TRIGGER (se existir)
-- =====================================================

-- 4.1 Trigger de oraculo_conversas
ALTER TRIGGER trg_touch_wa_conversas ON oraculo_conversas RENAME TO trg_touch_oraculo_conversas;

-- =====================================================
-- PASSO 5: VERIFICAÇÃO
-- =====================================================

-- Listar tabelas renomeadas
SELECT 'Tabelas renomeadas:' as status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'oraculo_%' ORDER BY tablename;

-- Contar registros
SELECT 'oraculo_mensagens' as tabela, COUNT(*) as registros FROM oraculo_mensagens
UNION ALL
SELECT 'oraculo_conversas', COUNT(*) FROM oraculo_conversas;

-- =====================================================
-- COMMIT OU ROLLBACK
-- =====================================================

-- Se tudo estiver OK, descomente a linha abaixo:
-- COMMIT;

-- Se houver erro, descomente a linha abaixo:
-- ROLLBACK;

-- Por segurança, deixando em aberto para você revisar antes de confirmar
SELECT 'ATENÇÃO: Revise os resultados e execute COMMIT; manualmente para confirmar' as aviso;
