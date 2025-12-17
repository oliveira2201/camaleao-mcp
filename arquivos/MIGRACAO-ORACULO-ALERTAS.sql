-- =====================================================
-- MIGRAÇÃO: SISTEMA UNIFICADO DE ALERTAS DO ORÁCULO
-- =====================================================
-- Data: 15/12/2025
-- Objetivo: Transformar wa_alertas em oraculo_alertas
--           Hub central para TODOS os agentes (WhatsApp, CRM, Meta Ads, etc)
-- =====================================================

BEGIN;

-- =====================================================
-- PASSO 1: RENOMEAR TABELA
-- =====================================================

ALTER TABLE wa_alertas RENAME TO oraculo_alertas;

-- Renomear constraints
ALTER TABLE oraculo_alertas RENAME CONSTRAINT wa_alertas_pkey TO oraculo_alertas_pkey;
ALTER TABLE oraculo_alertas RENAME CONSTRAINT wa_alertas_conversa_id_fkey TO oraculo_alertas_conversa_id_fkey;
ALTER TABLE oraculo_alertas RENAME CONSTRAINT wa_alertas_mensagem_id_fkey TO oraculo_alertas_mensagem_id_fkey;
ALTER TABLE oraculo_alertas RENAME CONSTRAINT wa_alertas_resolvido_por_fkey TO oraculo_alertas_resolvido_por_fkey;

-- Renomear índices
ALTER INDEX idx_wa_alertas_resolvido RENAME TO idx_oraculo_alertas_resolvido;
ALTER INDEX idx_wa_alertas_tipo_em RENAME TO idx_oraculo_alertas_tipo_em;

-- =====================================================
-- PASSO 2: ADICIONAR NOVOS CAMPOS
-- =====================================================

-- Campo: agente_origem (identifica qual agente criou o alerta)
ALTER TABLE oraculo_alertas
ADD COLUMN agente_origem TEXT NOT NULL DEFAULT 'whatsapp';

-- Campo: titulo (resumo rápido do alerta)
ALTER TABLE oraculo_alertas
ADD COLUMN titulo TEXT;

-- Campo: entidade_id (ID genérico - pedido, campanha, etc)
ALTER TABLE oraculo_alertas
ADD COLUMN entidade_id TEXT;

-- Remover default do agente_origem (só era pra migração)
ALTER TABLE oraculo_alertas
ALTER COLUMN agente_origem DROP DEFAULT;

-- =====================================================
-- PASSO 3: ADICIONAR NOVOS TIPOS DE ALERTA
-- =====================================================

-- IMPORTANTE: Não podemos renomear valores de ENUM existentes
-- Então vamos criar um NOVO ENUM e migrar

-- 3.1 Criar novo ENUM com todos os tipos
CREATE TYPE oraculo_tipo_alerta_novo AS ENUM (
  -- WhatsApp (mantém compatibilidade com antigos)
  'PIX_SUSPEITO',           -- Mantido para compatibilidade
  'CRISE_CLIENTE',          -- Mantido para compatibilidade
  'SLA_ATRASO',             -- Mantido para compatibilidade
  'FOLLOWUP_SUGERIDO',      -- Mantido para compatibilidade
  'QUALIDADE_BAIXA',        -- Mantido para compatibilidade
  'APROVACAO_REGISTRADA',   -- Mantido para compatibilidade

  -- WhatsApp (novos com prefixo)
  'WA_PIX_SUSPEITO',
  'WA_CRISE_CLIENTE',
  'WA_SLA_ATRASO',
  'WA_FOLLOWUP_SUGERIDO',
  'WA_QUALIDADE_BAIXA',
  'WA_APROVACAO_REGISTRADA',

  -- CRM
  'CRM_VALOR_ALTO',
  'CRM_PEDIDO_SUSPEITO',
  'CRM_PAGAMENTO_ATRASADO',
  'CRM_INCONSISTENCIA_FINANCEIRA',
  'CRM_COMPORTAMENTO_ANORMAL',
  'CRM_PEDIDO_FORA_HORARIO',

  -- Meta Ads
  'ADS_GASTO_ALTO',
  'ADS_CTR_BAIXO',
  'ADS_CAMPANHA_PAUSADA',
  'ADS_CONVERSAO_BAIXA',
  'ADS_CPC_ALTO',
  'ADS_ORCAMENTO_ESGOTADO',

  -- Sistema
  'SISTEMA_ERRO',
  'SISTEMA_PERFORMANCE',
  'SISTEMA_INTEGRACAO_FALHOU'
);

-- 3.2 Alterar coluna para usar novo ENUM
ALTER TABLE oraculo_alertas
  ALTER COLUMN tipo TYPE oraculo_tipo_alerta_novo
  USING tipo::text::oraculo_tipo_alerta_novo;

-- 3.3 Renomear ENUM
DROP TYPE wa_tipo_alerta;
ALTER TYPE oraculo_tipo_alerta_novo RENAME TO oraculo_tipo_alerta;

-- 3.4 Renomear ENUM de severidade também
ALTER TYPE wa_severidade_alerta RENAME TO oraculo_severidade_alerta;

-- =====================================================
-- PASSO 4: CRIAR ÍNDICES ADICIONAIS
-- =====================================================

-- Índice por agente_origem (filtrar alertas de cada agente)
CREATE INDEX idx_oraculo_alertas_agente ON oraculo_alertas(agente_origem);

-- Índice por entidade_id (buscar alertas de um pedido/campanha específica)
CREATE INDEX idx_oraculo_alertas_entidade ON oraculo_alertas(entidade_id) WHERE entidade_id IS NOT NULL;

-- Índice composto (alertas não resolvidos de um agente)
CREATE INDEX idx_oraculo_alertas_agente_resolvido ON oraculo_alertas(agente_origem, resolvido, criado_em DESC);

-- =====================================================
-- PASSO 5: ATUALIZAR FOREIGN KEYS DE OUTRAS TABELAS
-- =====================================================

-- Atualizar FK de producao_aprovacoes (se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'producao_aprovacoes_alerta_id_fkey'
  ) THEN
    -- A FK já aponta para a tabela (que foi renomeada), não precisa alterar
    NULL;
  END IF;
END $$;

-- =====================================================
-- PASSO 6: ADICIONAR COMENTÁRIOS (Documentação)
-- =====================================================

COMMENT ON TABLE oraculo_alertas IS 'Hub central de alertas de TODOS os agentes do Oráculo (WhatsApp, CRM, Meta Ads, etc)';
COMMENT ON COLUMN oraculo_alertas.agente_origem IS 'Agente que gerou o alerta: whatsapp, crm, meta-ads, sistema';
COMMENT ON COLUMN oraculo_alertas.titulo IS 'Resumo curto do alerta (ex: Pedido com valor muito alto)';
COMMENT ON COLUMN oraculo_alertas.entidade_id IS 'ID da entidade relacionada (pedido_id, campanha_id, etc)';
COMMENT ON COLUMN oraculo_alertas.conversa_id IS 'FK para oraculo_conversas (apenas alertas de WhatsApp)';
COMMENT ON COLUMN oraculo_alertas.mensagem_id IS 'FK para oraculo_mensagens (apenas alertas de WhatsApp)';
COMMENT ON COLUMN oraculo_alertas.detalhes IS 'Dados específicos do alerta em formato JSON';

-- =====================================================
-- PASSO 7: VERIFICAÇÃO
-- =====================================================

-- Listar estrutura da nova tabela
SELECT
  'oraculo_alertas' as tabela,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'oraculo_alertas'
ORDER BY ordinal_position;

-- Contar registros
SELECT
  'Total de alertas' as metrica,
  COUNT(*) as valor
FROM oraculo_alertas;

-- Listar tipos de alerta disponíveis
SELECT
  'Tipos de alerta disponíveis' as info,
  enumlabel as tipo
FROM pg_enum
WHERE enumtypid = 'oraculo_tipo_alerta'::regtype
ORDER BY enumsortorder;

-- =====================================================
-- COMMIT OU ROLLBACK
-- =====================================================

-- Se tudo estiver OK, descomente:
COMMIT;

-- Se houver erro, descomente:
-- ROLLBACK;

SELECT '✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!' as status;
SELECT 'Tabela oraculo_alertas está pronta para receber alertas de todos os agentes!' as mensagem;
