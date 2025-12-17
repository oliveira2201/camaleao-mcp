// Verificar formato de datas dos pedidos mais recentes
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

    console.log('🔍 Buscando 50 pedidos mais recentes...');

    const ordersQuery = await graphqlRequest(`
      query {
        orders(first: 50, page: 1) {
          data {
            id
            code
            created_at
            updated_at
            status {
              id
              text
            }
          }
        }
      }
    `);

    const pedidos = ordersQuery.data.orders.data;

    console.log(`\n📅 PRIMEIROS 20 PEDIDOS MAIS RECENTES:\n`);

    pedidos.slice(0, 20).forEach((p, i) => {
      console.log(`${i+1}. Pedido ${p.code}`);
      console.log(`   ID: ${p.id}`);
      console.log(`   Criado: ${p.created_at}`);
      console.log(`   Atualizado: ${p.updated_at}`);
      console.log(`   Status: [${p.status?.id}] ${p.status?.text || 'N/A'}`);
      console.log('');
    });

    // Procurar pedido 0412-8667
    const pedido8667 = pedidos.find(p => p.code && p.code.includes('8667'));
    if (pedido8667) {
      console.log('\n\n🎯 PEDIDO COM "8667" ENCONTRADO NOS MAIS RECENTES!');
      console.log(JSON.stringify(pedido8667, null, 2));
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

main();
