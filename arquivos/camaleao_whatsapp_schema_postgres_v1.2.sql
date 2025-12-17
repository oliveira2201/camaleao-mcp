-- Camaleão Camisas — WhatsApp Automations — Schema v1.2
-- Data: 14/12/2025
-- Banco: PostgreSQL
-- Observação: este schema é "MVP-friendly" para logs + alertas. Ajuste conforme sua Evolution payload.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE wa_tipo_mensagem AS ENUM ('text','image','audio','video','document','sticker','unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE wa_severidade_alerta AS ENUM ('LOW','MEDIUM','HIGH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE wa_tipo_alerta AS ENUM (
    'PIX_SUSPEITO',
    'CRISE_CLIENTE',
    'SLA_ATRASO',
    'FOLLOWUP_SUGERIDO',
    'QUALIDADE_BAIXA',
    'APROVACAO_REGISTRADA'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE producao_status_pedido AS ENUM ('ORCAMENTO','ARTE_ENVIADA','ARTE_APROVADA','PRODUCAO','PRONTO','ENTREGUE','CANCELADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS equipe_atendentes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  telefone        TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wa_conversas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remote_jid      TEXT NOT NULL,
  instancia       TEXT NOT NULL,
  atendente_id    UUID NULL REFERENCES equipe_atendentes(id),
  status          TEXT NULL,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  ultima_msg_em   TIMESTAMPTZ NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_wa_conversas UNIQUE (instancia, remote_jid)
);

CREATE INDEX IF NOT EXISTS idx_wa_conversas_ultima_msg_em ON wa_conversas (ultima_msg_em DESC);

CREATE TABLE IF NOT EXISTS wa_mensagens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instancia       TEXT NOT NULL,
  remote_jid      TEXT NOT NULL,
  wa_message_id   TEXT NOT NULL,
  is_from_me      BOOLEAN NOT NULL,
  atendente_id    UUID NULL REFERENCES equipe_atendentes(id),
  sender_nome     TEXT NOT NULL DEFAULT 'CLIENTE',
  conteudo        TEXT NULL,
  tipo_mensagem   wa_tipo_mensagem NOT NULL DEFAULT 'unknown',
  media_url       TEXT NULL,
  enviado_em      TIMESTAMPTZ NOT NULL,
  raw_payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_wa_mensagens_dedupe UNIQUE (instancia, wa_message_id)
);

CREATE INDEX IF NOT EXISTS idx_wa_mensagens_remote_jid ON wa_mensagens (remote_jid);
CREATE INDEX IF NOT EXISTS idx_wa_mensagens_enviado_em ON wa_mensagens (enviado_em DESC);
CREATE INDEX IF NOT EXISTS idx_wa_mensagens_from_me ON wa_mensagens (is_from_me);

CREATE TABLE IF NOT EXISTS wa_chaves_pix_oficiais (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao        TEXT NOT NULL,
  tipo             TEXT NOT NULL,
  chave_normalizada TEXT NOT NULL,
  ativo            BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pix_chave UNIQUE (chave_normalizada)
);

CREATE TABLE IF NOT EXISTS wa_alertas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id     UUID NULL REFERENCES wa_conversas(id) ON DELETE SET NULL,
  mensagem_id     UUID NULL REFERENCES wa_mensagens(id) ON DELETE SET NULL,
  tipo            wa_tipo_alerta NOT NULL,
  severidade      wa_severidade_alerta NOT NULL DEFAULT 'MEDIUM',
  detalhes        JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolvido       BOOLEAN NOT NULL DEFAULT FALSE,
  resolvido_em    TIMESTAMPTZ NULL,
  resolvido_por   UUID NULL REFERENCES equipe_atendentes(id),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_alertas_tipo_em ON wa_alertas (tipo, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_wa_alertas_resolvido ON wa_alertas (resolvido);

CREATE TABLE IF NOT EXISTS producao_pedidos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id     UUID NULL REFERENCES wa_conversas(id) ON DELETE SET NULL,
  remote_jid      TEXT NOT NULL,
  status          producao_status_pedido NOT NULL DEFAULT 'ORCAMENTO',
  itens_json      JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacoes     TEXT NULL,
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_producao_pedidos_status ON producao_pedidos (status);
CREATE INDEX IF NOT EXISTS idx_producao_pedidos_remote_jid ON producao_pedidos (remote_jid);

CREATE TABLE IF NOT EXISTS producao_aprovacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id       UUID NOT NULL REFERENCES producao_pedidos(id) ON DELETE CASCADE,
  mensagem_id     UUID NULL REFERENCES wa_mensagens(id) ON DELETE SET NULL,
  aprovado_por    TEXT NOT NULL DEFAULT 'CLIENTE',
  aprovado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observacao      TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_producao_aprovacoes_pedido ON producao_aprovacoes (pedido_id, aprovado_em DESC);

CREATE OR REPLACE VIEW vw_wa_ultima_mensagem_por_conversa AS
SELECT
  c.id AS conversa_id,
  c.instancia,
  c.remote_jid,
  c.atendente_id,
  m.id AS mensagem_id,
  m.is_from_me,
  m.conteudo,
  m.enviado_em
FROM wa_conversas c
JOIN LATERAL (
  SELECT *
  FROM wa_mensagens m2
  WHERE m2.instancia = c.instancia AND m2.remote_jid = c.remote_jid
  ORDER BY m2.enviado_em DESC
  LIMIT 1
) m ON TRUE;

CREATE OR REPLACE FUNCTION fn_touch_wa_conversas() RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_touch_wa_conversas
  BEFORE UPDATE ON wa_conversas
  FOR EACH ROW EXECUTE FUNCTION fn_touch_wa_conversas();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Inserir chaves Pix oficiais da Camaleão Camisas
INSERT INTO wa_chaves_pix_oficiais (descricao, tipo, chave_normalizada, ativo)
VALUES
  ('WhatsApp Camaleão', 'telefone', '5589981171458', TRUE),
  ('CNPJ Camaleão', 'cnpj', '52864651000123', TRUE)
ON CONFLICT (chave_normalizada) DO NOTHING;
