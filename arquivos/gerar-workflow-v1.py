#!/usr/bin/env python3
"""
Gera workflow N8N v1 do Agente Camaleão CRM
Completo com 6 ferramentas + CRON + Webhook
"""

import json
import os

# Credenciais e configurações
API_URL = "https://web-api.camaleaocamisas.com.br/graphql-api"
EMAIL = "api-gerente@email.com"
PASSWORD = "PPTDYBYqcmE7wg"
OPENAI_API_KEY = "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"

workflow = {
    "name": "Agente Camaleão CRM v1",
    "nodes": [
        # 1. Webhook Trigger
        {
            "parameters": {
                "path": "agente-camaleao-crm",
                "responseMode": "responseNode",
                "options": {}
            },
            "id": "webhook-trigger",
            "name": "🎯 Entrada Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 1,
            "position": [250, 300],
            "webhookId": "agente-camaleao-crm"
        },

        # 2. CRON Trigger
        {
            "parameters": {
                "rule": {
                    "interval": [
                        {
                            "field": "cronExpression",
                            "expression": "0 9,15 * * *"
                        }
                    ]
                }
            },
            "id": "cron-trigger",
            "name": "⏰ CRON Monitoramento",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1,
            "position": [250, 500]
        },

        # 3. Code Node - Detectar Pedidos Parados (CRON)
        {
            "parameters": {
                "language": "javaScript",
                "jsCode": f"""
// Detectar pedidos "Costurado e Embalado" parados > 2 dias
// REGRA: Apenas pedidos criados >= 01/09/2025

const https = require('https');

const API_URL = '{API_URL}';
const EMAIL = '{EMAIL}';
const PASSWORD = '{PASSWORD}';
const DATA_CORTE = '2025-09-01';
const DIAS_LIMITE = 2;

let cookies = '';

function graphqlRequest(query) {{
  return new Promise((resolve, reject) => {{
    const data = JSON.stringify({{ query }});
    const options = {{
      method: 'POST',
      headers: {{
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        ...(cookies && {{ 'Cookie': cookies }})
      }}
    }};

    const req = https.request(API_URL, options, (res) => {{
      if (res.headers['set-cookie']) {{
        cookies = res.headers['set-cookie'].join('; ');
      }}

      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {{
        try {{ resolve(JSON.parse(body)); }}
        catch (e) {{ reject(e); }}
      }});
    }});

    req.on('error', reject);
    req.write(data);
    req.end();
  }});
}}

// Login
await graphqlRequest(`mutation {{ login(email: "${{EMAIL}}", password: "${{PASSWORD}}", remember: false) {{ id }} }}`);

let pedidosParados = [];
const hoje = new Date();

// Buscar pedidos (páginas 50-100 = mais recentes)
for (let page = 50; page <= 100; page++) {{
  const ordersQuery = await graphqlRequest(`
    query {{
      orders(first: 100, page: ${{page}}) {{
        data {{
          id code created_at updated_at closed_at
          status {{ id text }}
          client {{ id name }}
        }}
      }}
    }}
  `);

  if (!ordersQuery.data?.orders) break;

  const pedidos = ordersQuery.data.orders.data;
  if (pedidos.length === 0) break;

  // Filtrar pedidos que atendem critérios
  const filtrados = pedidos.filter(p => {{
    if (p.status.id !== '5') return false;
    if (p.closed_at !== null) return false;
    if (p.created_at < DATA_CORTE) return false;

    const updatedAt = new Date(p.updated_at);
    const diasParado = Math.floor((hoje - updatedAt) / (1000 * 60 * 60 * 24));
    if (diasParado <= DIAS_LIMITE) return false;

    p.dias_parado = diasParado;
    return true;
  }});

  pedidosParados = pedidosParados.concat(filtrados);
}}

// Retornar resultados
return pedidosParados.map(p => ({{
  json: {{
    pedido_id: p.id,
    pedido_code: p.code,
    cliente_nome: p.client.name,
    status: p.status.text,
    dias_parado: p.dias_parado,
    criado_em: p.created_at,
    atualizado_em: p.updated_at,
    severidade: p.dias_parado > 7 ? 'CRITICAL' : 'HIGH'
  }}
}}));
"""
            },
            "id": "detectar-pedidos-cron",
            "name": "🔍 Detectar Pedidos Parados",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [450, 500]
        },

        # 4. IF Node - Tem pedidos parados?
        {
            "parameters": {
                "conditions": {
                    "number": [
                        {
                            "value1": "={{ $json.length }}",
                            "operation": "larger",
                            "value2": 0
                        }
                    ]
                }
            },
            "id": "if-tem-pedidos",
            "name": "❓ Tem Pedidos Parados?",
            "type": "n8n-nodes-base.if",
            "typeVersion": 1,
            "position": [650, 500]
        },

        # 5. PostgreSQL - Inserir Alertas
        {
            "parameters": {
                "operation": "executeQuery",
                "query": """INSERT INTO oraculo_alertas (
                    agente_origem, tipo, severidade, titulo, detalhes, entidade_id, resolvido
                ) VALUES (
                    'crm',
                    'CRM_PEDIDO_SUSPEITO',
                    '{{ $json.severidade }}',
                    'Pedido parado em Costurado e Embalado há {{ $json.dias_parado }} dias',
                    '{{ $json }}',
                    '{{ $json.pedido_id }}',
                    false
                ) ON CONFLICT DO NOTHING""",
                "options": {}
            },
            "id": "postgres-insert",
            "name": "💾 Criar Alerta no Banco",
            "type": "n8n-nodes-base.postgres",
            "typeVersion": 2,
            "position": [850, 450],
            "credentials": {
                "postgres": {
                    "id": "postgres-gestorconecta",
                    "name": "PostgreSQL GestorConecta"
                }
            }
        },

        # 6. OpenAI Agent (para Webhook)
        {
            "parameters": {
                "model": "gpt-4o",
                "messages": [
                    {
                        "role": "system",
                        "content": """Você é o Agente Camaleão CRM, assistente especializado em monitorar o CRM da Camaleão Camisas.

FERRAMENTAS DISPONÍVEIS:

1. consultar_pedidos - Buscar pedidos por período
2. espelho_bancario - Ver recebimentos PIX/cartão/dinheiro
3. consultar_pagamentos - Ver pagamentos e pendências
4. monitorar_pedidos_parados - Detectar pedidos parados em "Costurado e Embalado"
5. alterar_status_pedido - Mudar status de um pedido
6. consultar_historico_status - Ver histórico completo de status

IMPORTANTE: Use as ferramentas para responder as perguntas do usuário."""
                    },
                    {
                        "role": "user",
                        "content": "={{ $json.body.pergunta }}"
                    }
                ],
                "options": {
                    "temperature": 0.2,
                    "maxTokens": 2000
                },
                "tools": [
                    {
                        "type": "function",
                        "function": {
                            "name": "consultar_pedidos",
                            "description": "Consulta pedidos criados em um período específico",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "data_inicio": {
                                        "type": "string",
                                        "description": "Data início (YYYY-MM-DD)"
                                    },
                                    "data_fim": {
                                        "type": "string",
                                        "description": "Data fim (YYYY-MM-DD)"
                                    }
                                },
                                "required": ["data_inicio", "data_fim"]
                            }
                        }
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "espelho_bancario",
                            "description": "Consulta recebimentos via PIX, cartão e dinheiro de um dia",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "data": {
                                        "type": "string",
                                        "description": "Data (YYYY-MM-DD)"
                                    }
                                },
                                "required": ["data"]
                            }
                        }
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "consultar_pagamentos",
                            "description": "Consulta pagamentos e pendências de um pedido",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "pedido_id": {
                                        "type": "string",
                                        "description": "ID do pedido"
                                    }
                                },
                                "required": ["pedido_id"]
                            }
                        }
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "monitorar_pedidos_parados",
                            "description": "Detecta pedidos em 'Costurado e Embalado' parados há mais de 2 dias (apenas pedidos criados a partir de 01/09/2025)",
                            "parameters": {
                                "type": "object",
                                "properties": {}
                            }
                        }
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "alterar_status_pedido",
                            "description": "Altera o status de um pedido. Status IDs: 5=Costurado e Embalado, 18=Entregue ou Enviado, 21=Concluido pelo Sistema, 22=Cadastrado, 23=Analisado, 26=Pagamento Auditado",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "pedido_id": {
                                        "type": "string",
                                        "description": "ID do pedido"
                                    },
                                    "novo_status_id": {
                                        "type": "string",
                                        "description": "ID do novo status"
                                    }
                                },
                                "required": ["pedido_id", "novo_status_id"]
                            }
                        }
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "consultar_historico_status",
                            "description": "Consulta o histórico completo de status de um pedido",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "pedido_id": {
                                        "type": "string",
                                        "description": "ID do pedido"
                                    }
                                },
                                "required": ["pedido_id"]
                            }
                        }
                    }
                ]
            },
            "id": "openai-agent",
            "name": "🤖 Agente Camaleão",
            "type": "@n8n/n8n-nodes-langchain.agent",
            "typeVersion": 1,
            "position": [450, 300]
        },

        # 7. Respond to Webhook
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": "={{ {{ resposta: $json.output }} }}"
            },
            "id": "respond-webhook",
            "name": "📤 Responder Webhook",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1,
            "position": [650, 300]
        }
    ],
    "connections": {
        "🎯 Entrada Webhook": {
            "main": [[{"node": "🤖 Agente Camaleão", "type": "main", "index": 0}]]
        },
        "⏰ CRON Monitoramento": {
            "main": [[{"node": "🔍 Detectar Pedidos Parados", "type": "main", "index": 0}]]
        },
        "🔍 Detectar Pedidos Parados": {
            "main": [[{"node": "❓ Tem Pedidos Parados?", "type": "main", "index": 0}]]
        },
        "❓ Tem Pedidos Parados?": {
            "main": [[{"node": "💾 Criar Alerta no Banco", "type": "main", "index": 0}], []]
        },
        "🤖 Agente Camaleão": {
            "main": [[{"node": "📤 Responder Webhook", "type": "main", "index": 0}]]
        }
    },
    "settings": {
        "executionOrder": "v1"
    },
    "staticData": None,
    "tags": [],
    "triggerCount": 2,
    "updatedAt": "2025-12-15T00:00:00.000Z",
    "versionId": "1"
}

# Salvar workflow
output_path = os.path.join(
    os.path.dirname(__file__),
    '..',
    'workflows',
    'agente-camaleao-crm',
    'Agente Camaleão CRM v1.json'
)

os.makedirs(os.path.dirname(output_path), exist_ok=True)

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(workflow, f, indent=2, ensure_ascii=False)

print(f"✅ Workflow gerado com sucesso:")
print(f"   {output_path}")
print(f"\n📊 Estatísticas:")
print(f"   - Nodes: {len(workflow['nodes'])}")
print(f"   - Triggers: 2 (Webhook + CRON)")
print(f"   - Ferramentas: 6")
print(f"\n🚀 Importar no N8N:")
print(f"   1. Acesse https://n8n.gestorconecta.com.br")
print(f"   2. Workflows > Importar")
print(f"   3. Selecione: Agente Camaleão CRM v1.json")
