// Buscar pedido de 2024 com status "Costurado e Embalado"
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

    console.log('🔍 Buscando pedidos de 2024 com status "Costurado e Embalado"...\n');

    let pedidosEncontrados = [];

    // Buscar em múltiplas páginas
    for (let page = 1; page <= 100; page++) {
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
                id
                name
              }
            }
          }
        }
      `);

      if (!ordersQuery.data || !ordersQuery.data.orders) {
        console.error('Erro na resposta da API:', JSON.stringify(ordersQuery, null, 2));
        break;
      }

      const pedidos2024Costurado = ordersQuery.data.orders.data.filter(order => {
        return order.created_at &&
               order.created_at.startsWith('2024') &&
               order.status &&
               order.status.id === '5'; // Costurado e Embalado
      });

      if (pedidos2024Costurado.length > 0) {
        pedidosEncontrados = pedidosEncontrados.concat(pedidos2024Costurado);
        console.log(`✅ Página ${page}: Encontrados ${pedidos2024Costurado.length} pedidos`);

        // Se já encontrou pelo menos 1, pode parar
        if (pedidosEncontrados.length > 0) {
          break;
        }
      }

      if (ordersQuery.data.orders.data.length < 100) {
        break;
      }
    }

    if (pedidosEncontrados.length === 0) {
      console.log('❌ Nenhum pedido de 2024 com status "Costurado e Embalado" encontrado');
      return;
    }

    console.log(`\n\n✅ Total encontrado: ${pedidosEncontrados.length} pedidos de 2024 com status "Costurado e Embalado"\n`);

    // Pegar o primeiro pedido encontrado
    const pedido = pedidosEncontrados[0];

    console.log('📦 PEDIDO ENCONTRADO:');
    console.log('=====================\n');
    console.log(JSON.stringify(pedido, null, 2));

    console.log('\n\n📋 RESUMO:');
    console.log('==========');
    console.log(`Código: ${pedido.code}`);
    console.log(`ID: ${pedido.id}`);
    console.log(`Cliente: ${pedido.client.name}`);
    console.log(`Status: [${pedido.status.id}] ${pedido.status.text}`);
    console.log(`Criado em: ${pedido.created_at}`);
    console.log(`Última atualização: ${pedido.updated_at}`);

    const updatedAt = new Date(pedido.updated_at);
    const hoje = new Date();
    const diasParado = Math.floor((hoje - updatedAt) / (1000 * 60 * 60 * 24));
    console.log(`Parado há: ${diasParado} dias`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

main();
