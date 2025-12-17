# Automações para WhatsApp — Camaleão Camisas
**Versão:** 1.2 (revisado)  
**Data:** 14/12/2025  
**Contexto:** Automação, Auditoria e Gestão de WhatsApp para “Camaleão Camisas”.

> Diretriz do MVP: **começar com alertas mesmo com falso-positivo**, medir o que acontece e ir “apertando o filtro” por dados reais (não por teoria).

---

## 1) Visão Geral da Arquitetura (“O Polvo”)
O sistema não é “10 robôs”. É uma **plataforma central** que:
- recebe eventos do WhatsApp,
- registra tudo com rastreabilidade,
- aplica regras rígidas (quando possível) e regras flexíveis (IA),
- dispara alertas, tarefas e relatórios.

### Fluxo de dados (macro)
1. **Entrada:** Evolution API (webhook) recebe mensagens/eventos.  
2. **Roteador (n8n):** workflow central normaliza payload e decide rotas.  
3. **Cérebro Lógico:** regras duras (Regex/JS/SQL) e gatilhos.  
4. **Cérebro Criativo (IA):** sentimento, qualidade, extração estruturada.  
5. **Memória (DB):** histórico, alertas, pedidos, métricas.

---

## 2) Os 10 Módulos (melhorados e “pé no chão”)

### 🛡️ Pilar 1 — Segurança e Auditoria
#### Módulo 1) Auditoria Financeira (Anti-Roubo de Pix)
- **Tipo:** Lógica (Regex + lista branca) + modo “aprendizado”
- **Dor que resolve:** reduzir risco de desvio de pagamento por Pix em conversas.
- **Como funciona (MVP com falso-positivo aceitável):**
  1. Analisa mensagens enviadas pela empresa (`fromMe: true`).
  2. Detecta **possíveis** chaves Pix (CPF/CNPJ/E-mail/Tel/Aleatória) via regex.
  3. Compara com **Allowlist de chaves oficiais**.
  4. Se não bater, cria alerta **PIX_SUSPEITO** (HIGH) e notifica o dono.
- **Notas importantes (do jeito que você pediu):**
  - **No começo**: alerta “mais sensível” (vai apitar mais) para entender padrões reais.
  - Depois: adiciona filtros por contexto (“pix”, “pagar”, “chave”, “transferir”) e reduz ruído.

**Saída padrão do alerta (mínimo):** atendente (se tiver), cliente, trecho, chave detectada, `wa_message_id`, horário.

---

#### Módulo 2) Termômetro de Crise (Cliente em risco)
- **Tipo:** IA (sentimento + intenção) + palavras-gatilho
- **Dor que resolve:** identificar cedo clientes propensos a cancelamento/Procon/estorno.
- **Como funciona:**
  1. Toda mensagem do cliente entra no pipeline.
  2. Classifica risco: **LOW / MEDIUM / HIGH**.
  3. Se HIGH, notifica gerente/dono com contexto mínimo.
- **Gatilhos fortes (exemplos):**
  “procon”, “processo”, “estorno”, “quero meu dinheiro”, “absurdo”, “golpe”, “não chegou”, “atraso”, “cancelar”.
- **Ação:** alerta + tag da conversa `CRISE` para priorização.

---

### 💰 Pilar 2 — Vendas e Performance
#### Módulo 3) Recuperador de Vácuo (Follow-up de orçamento)
- **Tipo:** Automação (Cron + SQL) + templates
- **Dor que resolve:** orçamento “morre” e dinheiro fica na mesa.
- **Como funciona (MVP):**
  1. A cada X minutos (ex.: 15), varre conversas.
  2. Critério: última mensagem foi da empresa **e** contém sinal de orçamento (R$, “valor”, “pix”, “total”) **e** cliente não respondeu em 24h.
  3. Gera tarefa/alerta “FOLLOWUP” para o atendente responsável (ou lista geral, se não houver).
- **Saída:** mensagem sugerida + link/ID da conversa.

---

#### Módulo 4) Gamificação / Ranking (sem “loucura”)
- **Tipo:** Analytics (SQL) + relatório semanal
- **Dor que resolve:** falta de visibilidade e motivação baseada em dados.
- **Como funciona:**
  - Calcula indicadores **objetivos**:
    - tempo de primeira resposta
    - volume de atendimentos
    - follow-ups executados
    - conversas marcadas como “fechadas” (se houver processo)
  - Publica ranking semanal (texto ou imagem).
- **Boa prática:** deixar claro que é **indicador**, não “punição”.

---

### 🎓 Pilar 3 — Cultura e Qualidade
#### Módulo 5) Supervisor de Qualidade (Auditoria de atendimento)
- **Tipo:** IA (processamento em lote)
- **Dor que resolve:** inconsistência de atendimento, falta de padrão, erros recorrentes.
- **Como funciona:**
  1. 1x/dia, pega amostras do dia anterior (por atendente).
  2. Aplica rubrica simples (0–10) com critérios:
     - clareza / educação / objetividade
     - condução para fechamento
     - respeito às políticas (prazo, preço, Pix)
  3. Entrega feedback curto: **3 pontos + 1 ajuste prático**.
- **Saída:** relatório interno + registro no banco.

---

#### Módulo 6) Copiloto Técnico (Respostas rápidas e corretas)
- **Tipo:** IA + Base de Conhecimento (RAG) — evolução por etapas
- **Dor que resolve:** atendente trava em dúvidas técnicas (DTF, silk, tecido, prazo, arte).
- **Como funciona (começo simples):**
  - MVP: “FAQ/Playbook” em texto (20–50 perguntas comuns).
  - Fase 2: PDFs e documentos indexados (RAG).
- **Saída:** “sussurro” pro atendente com resposta pronta e curta.

---

### 🏭 Pilar 4 — Produção e Logística
#### Módulo 7) Gestor de Aprovação (Arte / Pedido)
- **Tipo:** Lógica condicional + rastreio por ID
- **Dor que resolve:** produzir errado porque o “OK” do cliente se perdeu.
- **Como funciona:**
  1. Detecta envio de arte pela empresa (imagem/PDF) e marca “ARTE_ENVIADA”.
  2. Detecta confirmação do cliente (“aprovado”, “pode fazer”, “ok”, “fechado”).
  3. Registra evento com **Message ID** e timestamp.
- **Saída:** registro de aprovação e atualização do status do pedido.

---

#### Módulo 8) Extrator de Grade (Order Parser)
- **Tipo:** IA (extração estruturada) + validação
- **Dor que resolve:** erro ao transcrever pedido do WhatsApp pra planilha/corte.
- **Como funciona:**
  1. Lê texto “bagunçado” e converte em JSON de itens.
  2. Retorna também `confidence` e `campos_duvidosos`.
- **Saída (exemplo):**
```json
{
  "confidence": 0.82,
  "itens": [
    { "modelo": "Camiseta", "tam": "M", "qtd": 2 },
    { "modelo": "Baby Look", "tam": "G", "qtd": 1 }
  ],
  "campos_duvidosos": []
}
```
- **Regra prática:** se `confidence < 0.70`, pede confirmação humana.

---

### 🧠 Pilar 5 — Estratégia e RH
#### Módulo 9) Radar de Recompra (11 meses / sazonal)
- **Tipo:** Automação (Cron mensal) + lembretes
- **Dor que resolve:** esquecer clientes recorrentes (turmas, eventos anuais).
- **Como funciona:**
  - após venda/evento, marca `data_base_recompra`
  - gera lembrete 11 meses depois com template pronto
- **Saída:** tarefa + mensagem sugerida.

---

#### Módulo 10) Ponto Invisível (Sinais de presença operacional)
- **Tipo:** Analytics (logs) — com responsabilidade
- **Dor que resolve:** falta de visibilidade de operação remota.
- **Como funciona:**
  - registra primeira e última atividade por atendente/dia
  - identifica “dias sem atuação”
- **Cuidados:** tratar como **gestão de operação**, não invasão; acesso restrito.

---

## 3) Banco de Dados (recomendação prática)
O banco é o “coração” que permite:
- auditoria com prova (message_id, timestamp, remetente),
- métricas confiáveis,
- relatórios e ranking,
- reprocessamento (se amanhã você mudar regra, recalcula).

> Incluí um schema PostgreSQL v1.2 junto (arquivo separado).

---

## 4) MVP sugerido (o que eu faria primeiro, no seu cenário atual)
1) **Registrar tudo** (mensagens/eventos + dedupe por `wa_message_id`)  
2) **Anti-Pix em modo sensível (alertas)**  
3) **Recuperador de Vácuo (24h)**  
4) **Gestor de Aprovação**  
5) **Termômetro de Crise**  
6) **Extrator de Grade**  
7) Ranking  
8) Supervisor de Qualidade  
9) Radar de Recompra  
10) Ponto Invisível

---

## 5) Templates prontos (curtos, para MVP)
**Follow-up 24h:**  
“Oi {{nome}}, tudo certo? Você conseguiu ver o orçamento de R$ {{valor}}? Se quiser, fecho com você agora 🙂”

**Recompra (11 meses):**  
“Oi {{nome}}! Ano passado vocês fizeram com a gente. Já vai ter encomenda esse ano? Posso te mandar uma proposta atualizada.”

---

## 6) Nota final (do seu jeito: aprender rápido)
- Comece com alertas “barulhentos” (falso-positivo ok).  
- Em 7 dias você vai ter dados reais para ajustar regex, contexto e severidade.  
- O sistema evolui com “telemetria”, não com achismo.
