// Monitorar pedidos "Costurado e Embalado" parados > 2 dias
// REGRA: Apenas pedidos criados a partir de 01/09/2025

const https = require('https');

const API_URL = 'https://web-api.camaleaocamisas.com.br/graphql-api';
const EMAIL = 'api-gerente@email.com';
const PASSWORD = 'PPTDYBYqcmE7wg';

// Data de corte: 01/09/2025
const DATA_CORTE = '2025-09-01';
const DIAS_LIMITE = 2;

let cookies = '';

function graphqlRequest(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        ...(cookies && { 'Cookie': cookies })
      }
    };

    const req = https.request(API_URL, options, (res) => {
      if (res.headers['set-cookie']) {
        cookies = res.headers['set-cookie'].join('; ');
      }

      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  try {
    console.log('🔐 Fazendo login...');
    await graphqlRequest(`
      mutation {
        login(email: "${EMAIL}", password: "${PASSWORD}", remember: false) {
          id name
        }
      }
    `);
    console.log('✅ Login OK\n');

    console.log('🔍 Buscando pedidos "Costurado e Embalado" criados a partir de ${DATA_CORTE}...\n');

    let pedidosParados = [];
    const hoje = new Date();

    // Buscar pedidos em múltiplas páginas (pedidos recentes estão nas últimas páginas)
    for (let page = 50; page <= 100; page++) {
      const ordersQuery = await graphqlRequest(`
        query {
          orders(first: 100, page: ${page}) {
            data {
              id
              code
              created_at
              updated_at
              closed_at
              status {
                id
                text
              }
              client {
                id
                name
              }
            }
          }
        }
      `);

      if (!ordersQuery.data || !ordersQuery.data.orders) {
        console.log(`⚠️  Erro na página ${page}, pulando...`);
        continue;
      }

      const pedidos = ordersQuery.data.orders.data;

      if (pedidos.length === 0) {
        console.log(`Página ${page}: fim dos dados`);
        break;
      }

      // Filtrar pedidos que atendem os critérios
      const pedidosFiltrados = pedidos.filter(pedido => {
        // 1. Status "Costurado e Embalado"
        if (pedido.status.id !== '5') return false;

        // 2. NÃO foi fechado manualmente
        if (pedido.closed_at !== null) return false;

        // 3. Criado a partir de 01/09/2025
        if (pedido.created_at < DATA_CORTE) return false;

        // 4. Parado há mais de 2 dias
        const updatedAt = new Date(pedido.updated_at);
        const diasParado = Math.floor((hoje - updatedAt) / (1000 * 60 * 60 * 24));
        if (diasParado <= DIAS_LIMITE) return false;

        // Adicionar dias_parado ao pedido
        pedido.dias_parado = diasParado;

        return true;
      });

      if (pedidosFiltrados.length > 0) {
        pedidosParados = pedidosParados.concat(pedidosFiltrados);
        console.log(`✅ Página ${page}: ${pedidosFiltrados.length} pedidos parados encontrados`);
      }

      if (page % 10 === 0) {
        console.log(`Progresso: ${page} páginas processadas...`);
      }
    }

    console.log(`\n\n📊 RESULTADO DO MONITORAMENTO:`);
    console.log('================================\n');

    if (pedidosParados.length === 0) {
      console.log('✅ Nenhum pedido parado encontrado! Tudo OK.');
      return { alertas: [] };
    }

    console.log(`⚠️  TOTAL: ${pedidosParados.length} pedidos parados encontrados\n`);

    // Ordenar por dias parado (mais crítico primeiro)
    pedidosParados.sort((a, b) => b.dias_parado - a.dias_parado);

    // Mostrar detalhes
    console.log('📋 PEDIDOS PARADOS:');
    console.log('===================\n');

    const alertas = pedidosParados.map((pedido, index) => {
      console.log(`${index + 1}. Pedido ${pedido.code} (ID: ${pedido.id})`);
      console.log(`   Cliente: ${pedido.client.name}`);
      console.log(`   Criado: ${pedido.created_at}`);
      console.log(`   Última atualização: ${pedido.updated_at}`);
      console.log(`   ⏰ Parado há ${pedido.dias_parado} dias\n`);

      // Criar objeto de alerta
      return {
        pedido_id: pedido.id,
        pedido_code: pedido.code,
        cliente_nome: pedido.client.name,
        status: pedido.status.text,
        dias_parado: pedido.dias_parado,
        criado_em: pedido.created_at,
        atualizado_em: pedido.updated_at,
        severidade: pedido.dias_parado > 7 ? 'CRITICAL' : 'HIGH'
      };
    });

    // Retornar alertas em formato JSON (para usar no N8N)
    console.log('\n\n📤 ALERTAS PARA INSERIR NO BANCO:');
    console.log('==================================\n');
    console.log(JSON.stringify(alertas, null, 2));

    return { alertas };

  } catch (error) {
    console.error('❌ Erro:', error.message);
    return { alertas: [], erro: error.message };
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  main().then(result => {
    process.exit(0);
  }).catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
}

// Exportar para uso no N8N
module.exports = { monitorarPedidosParados: main };
