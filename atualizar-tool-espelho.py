#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Atualiza a tool espelho_bancario no workflow JSON
"""

import json
import sys
import io

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Ler o código corrigido (v3.1 com timeout e proteções)
with open('tool-espelho-bancario-v3.1-TIMEOUT.js', 'r', encoding='utf-8') as f:
    codigo_novo = f.read()

# Remover comentários iniciais do JavaScript
linhas = codigo_novo.split('\n')
codigo_limpo_linhas = []
pulando_comentarios = True

for linha in linhas:
    stripped = linha.strip()
    # Pular comentários iniciais
    if pulando_comentarios:
        if stripped.startswith('//') or stripped == '':
            continue
        else:
            pulando_comentarios = False
    codigo_limpo_linhas.append(linha)

codigo_novo = '\n'.join(codigo_limpo_linhas)

# Ler o workflow JSON
with open('workflows/agente-camaleao-crm/Agente Camaleão CRM.json', 'r', encoding='utf-8') as f:
    workflow = json.load(f)

# Encontrar e atualizar a tool espelho_bancario
encontrou = False
for node in workflow['nodes']:
    if node.get('parameters', {}).get('name') == 'espelho_bancario':
        print(f"✅ Encontrou node: {node.get('name')}")
        node['parameters']['jsCode'] = codigo_novo

        # Atualizar a descrição também
        node['parameters']['description'] = (
            "Consulta recebimentos PIX, cartão e dinheiro. "
            "SUPORTA PERÍODOS: dia único (data: 'hoje'), período manual (data_inicio, data_fim), "
            "ou período natural (periodo: 'novembro', 'ultimos 15 dias', 'esta semana', 'ano de 2025'). "
            "PROTEÇÕES: timeout 45s, máx 20 páginas (2000 registros). "
            "Retorna total recebido, saldo e detalhes por via."
        )

        encontrou = True
        print(f"✅ Código atualizado! Tamanho: {len(codigo_novo)} caracteres")
        print(f"✅ Descrição atualizada para incluir suporte a períodos")
        break

if not encontrou:
    print("❌ ERRO: Não encontrou a tool 'espelho_bancario' no workflow!")
    sys.exit(1)

# Atualizar o system message do agente também
print("\n📝 Atualizando system message do agente...")
for node in workflow['nodes']:
    if node.get('name') == '🤖 Agente Camaleão':
        # Ler o novo system message
        with open('system-message-agente-crm-v3.txt', 'r', encoding='utf-8') as f:
            novo_system_message = f.read()

        node['parameters']['options']['systemMessage'] = novo_system_message
        print("✅ System message atualizado!")
        break

# Atualizar nome do workflow
workflow['name'] = 'Agente Camaleão CRM v3.1 (períodos + timeout + proteções)'
print("✅ Nome do workflow atualizado para v3.1")

# Salvar o JSON atualizado
output_file = 'workflows/agente-camaleao-crm/Agente Camaleão CRM.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(workflow, f, indent=2, ensure_ascii=False)

print(f"✅ Workflow salvo em: {output_file}")
print("\n📋 Próximos passos:")
print("1. Importe o JSON atualizado no n8n")
print("2. Teste com período: 'quanto caiu de pix esse mes?'")
print("3. Verifique se:")
print("   - Responde em menos de 45 segundos")
print("   - Mostra mensagem de aguarde antes de calcular")
print("   - Não trava por 10+ minutos")
