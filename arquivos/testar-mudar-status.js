// Testar alteração de status de pedido
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

    // 1. Buscar status atual do pedido 0412-8667
    console.log('🔍 Consultando pedido 0412-8667 (ID: 8603)...\n');

    const orderQuery = await graphqlRequest(`
      query {
        order(id: "8603") {
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
    `);

    if (!orderQuery.data || !orderQuery.data.order) {
      console.error('❌ Pedido não encontrado!');
      return;
    }

    const pedidoAntes = orderQuery.data.order;

    console.log('📦 STATUS ATUAL DO PEDIDO:');
    console.log('==========================');
    console.log(`Código: ${pedidoAntes.code}`);
    console.log(`Cliente: ${pedidoAntes.client.name}`);
    console.log(`Status atual: [${pedidoAntes.status.id}] ${pedidoAntes.status.text}`);
    console.log(`Última atualização: ${pedidoAntes.updated_at}`);

    console.log('\n\n⚠️  ATENÇÃO: Esta ação VAI ALTERAR O STATUS NO SISTEMA REAL!');
    console.log('Para testar, vou mudar de:');
    console.log(`  [5] Costurado e Embalado`);
    console.log('Para:');
    console.log(`  [18] Entregue ou Enviado`);
    console.log('\nPara cancelar, pressione Ctrl+C nos próximos 5 segundos...\n');

    // Aguardar 5 segundos
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🔄 Alterando status do pedido...\n');

    const updateResult = await graphqlRequest(`
      mutation {
        orderUpdateStatus(
          id: "8603"
          status_id: "18"
          override_option: NONE
        ) {
          id
          code
          updated_at
          status {
            id
            text
          }
        }
      }
    `);

    if (updateResult.errors) {
      console.error('❌ ERRO ao alterar status:');
      console.error(JSON.stringify(updateResult.errors, null, 2));
      return;
    }

    if (!updateResult.data || !updateResult.data.orderUpdateStatus) {
      console.error('❌ Resposta inesperada da API:');
      console.error(JSON.stringify(updateResult, null, 2));
      return;
    }

    const pedidoDepois = updateResult.data.orderUpdateStatus;

    console.log('✅ STATUS ALTERADO COM SUCESSO!');
    console.log('================================\n');
    console.log('ANTES:');
    console.log(`  Status: [${pedidoAntes.status.id}] ${pedidoAntes.status.text}`);
    console.log(`  Atualizado em: ${pedidoAntes.updated_at}`);
    console.log('\nDEPOIS:');
    console.log(`  Status: [${pedidoDepois.status.id}] ${pedidoDepois.status.text}`);
    console.log(`  Atualizado em: ${pedidoDepois.updated_at}`);

    console.log('\n\n🔄 Revertendo para status original...\n');

    // Reverter para status original
    const revertResult = await graphqlRequest(`
      mutation {
        orderUpdateStatus(
          id: "8603"
          status_id: "5"
          override_option: NONE
        ) {
          id
          code
          status {
            id
            text
          }
          updated_at
        }
      }
    `);

    if (revertResult.data && revertResult.data.orderUpdateStatus) {
      console.log('✅ Status revertido para original!');
      console.log(`   Status: [${revertResult.data.orderUpdateStatus.status.id}] ${revertResult.data.orderUpdateStatus.status.text}`);
      console.log(`   Atualizado em: ${revertResult.data.orderUpdateStatus.updated_at}`);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('Resposta completa:', JSON.stringify(error.response, null, 2));
    }
  }
}

main();
