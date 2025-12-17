// Buscar pedidos MAIS RECENTES percorrendo páginas até encontrar pedidos de 2024
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

    console.log('🔍 Buscando pedidos recentes (2024) em múltiplas páginas...\n');

    let todosStatusEncontrados = new Map();
    let pedidos2024 = [];
    let pedido8667 = null;

    // Buscar em 100 páginas para aumentar chances de encontrar pedidos recentes
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
                name
              }
            }
          }
        }
      `);

      const pedidos = ordersQuery.data.orders.data;

      if (pedidos.length === 0) {
        console.log(`Página ${page}: Nenhum pedido retornado (fim dos dados)`);
        break;
      }

      // Coletar todos os status
      pedidos.forEach(p => {
        if (p.status) {
          const key = `[${p.status.id}] ${p.status.text}`;
          todosStatusEncontrados.set(key, (todosStatusEncontrados.get(key) || 0) + 1);
        }
      });

      // Filtrar pedidos de 2024
      const pedidos2024NestaPagina = pedidos.filter(p =>
        p.created_at && p.created_at.startsWith('2024')
      );

      if (pedidos2024NestaPagina.length > 0) {
        pedidos2024 = pedidos2024.concat(pedidos2024NestaPagina);
        console.log(`✅ Página ${page}: ${pedidos2024NestaPagina.length} pedidos de 2024 encontrados`);
      }

      // Procurar pedido 8667
      const found8667 = pedidos.find(p => p.code && p.code.includes('8667'));
      if (found8667) {
        pedido8667 = found8667;
        console.log(`\n🎯 PEDIDO COM "8667" ENCONTRADO NA PÁGINA ${page}!`);
      }

      // Progress
      if (page % 10 === 0) {
        console.log(`Progresso: ${page} páginas processadas...`);
      }
    }

    console.log(`\n\n📊 TODOS OS STATUS ENCONTRADOS NO SISTEMA (${todosStatusEncontrados.size} tipos):`);
    console.log('=================================================================');
    Array.from(todosStatusEncontrados.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([status, count]) => {
        console.log(`  ${status}: ${count} pedidos`);
      });

    console.log(`\n\n📅 PEDIDOS DE 2024: ${pedidos2024.length} encontrados`);

    if (pedidos2024.length > 0) {
      // Agrupar por status
      const statusMap2024 = new Map();
      pedidos2024.forEach(p => {
        if (p.status) {
          const key = `[${p.status.id}] ${p.status.text}`;
          statusMap2024.set(key, (statusMap2024.get(key) || 0) + 1);
        }
      });

      console.log('\n📊 STATUS DOS PEDIDOS DE 2024:');
      console.log('================================');
      Array.from(statusMap2024.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([status, count]) => {
          console.log(`  ${status}: ${count} pedidos`);
        });

      // Mostrar primeiros 10 de 2024
      console.log('\n📦 PRIMEIROS 10 PEDIDOS DE 2024:');
      pedidos2024.slice(0, 10).forEach((p, i) => {
        console.log(`\n${i+1}. Pedido ${p.code}`);
        console.log(`   ID: ${p.id}`);
        console.log(`   Criado: ${p.created_at}`);
        console.log(`   Atualizado: ${p.updated_at}`);
        console.log(`   Status: ${p.status?.text || 'N/A'}`);
      });
    }

    if (pedido8667) {
      console.log('\n\n🎯 DETALHES DO PEDIDO COM "8667":');
      console.log('===================================');
      console.log(JSON.stringify(pedido8667, null, 2));
    } else {
      console.log('\n\n❌ Pedido com "8667" não encontrado nas 100 primeiras páginas (10.000 pedidos)');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

main();
