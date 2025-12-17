// Buscar pedidos de DEZEMBRO 2025 para encontrar todos os status
const https = require('https');

const API_URL = 'https://web-api.camaleaocamisas.com.br/graphql-api';
const EMAIL = 'api-gerente@email.com';
const PASSWORD = 'PPTDYBYqcmE7wg';

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

    console.log('🔍 Buscando pedidos CRIADOS em dezembro 2024...');

    // Buscar pedidos de dezembro 2024 (páginas iniciais = mais recentes)
    let todosPedidosDezembro = [];

    for (let page = 1; page <= 20; page++) {
      const ordersQuery = await graphqlRequest(`
        query {
          orders(first: 100, page: ${page}) {
            data {
              id
              code
              created_at
              updated_at
              status {
                id
                text
              }
              client {
                name
              }
            }
          }
        }
      `);

      const pedidosDezembro = ordersQuery.data.orders.data.filter(order => {
        return order.created_at && order.created_at.startsWith('2024-12');
      });

      todosPedidosDezembro = todosPedidosDezembro.concat(pedidosDezembro);

      console.log(`Página ${page}: ${pedidosDezembro.length} pedidos de dezembro encontrados`);

      // Se não encontrou nenhum nesta página, provavelmente acabaram os de dezembro
      if (pedidosDezembro.length === 0 && page > 5) {
        console.log('Nenhum pedido de dezembro nesta página, parando...');
        break;
      }
    }

    console.log(`\n✅ Total de pedidos de DEZEMBRO 2024: ${todosPedidosDezembro.length}`);

    // Agrupar por status
    const statusMap = new Map();
    todosPedidosDezembro.forEach(p => {
      if (p.status) {
        const key = `[${p.status.id}] ${p.status.text}`;
        statusMap.set(key, (statusMap.get(key) || 0) + 1);
      } else {
        statusMap.set('[SEM STATUS]', (statusMap.get('[SEM STATUS]') || 0) + 1);
      }
    });

    console.log('\n📊 STATUS ENCONTRADOS nos pedidos de DEZEMBRO 2024:');
    console.log('===================================================');
    Array.from(statusMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`  ${status}: ${count} pedidos`);
      });

    // Procurar pedido 0412-8667
    const pedido8667 = todosPedidosDezembro.find(p =>
      p.code && p.code.includes('8667')
    );

    if (pedido8667) {
      console.log('\n\n🎯 PEDIDO 0412-8667 ENCONTRADO!');
      console.log(JSON.stringify(pedido8667, null, 2));
    } else {
      console.log('\n\n❌ Pedido 0412-8667 não encontrado em dezembro 2024');

      // Mostrar alguns exemplos
      console.log('\n📦 Primeiros 10 pedidos de dezembro 2024:');
      todosPedidosDezembro.slice(0, 10).forEach((p, i) => {
        console.log(`${i+1}. ${p.code} - Status: ${p.status?.text || 'N/A'} - ${p.created_at}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

main();
