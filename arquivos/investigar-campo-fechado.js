// Investigar campos do pedido 6405 (5573-04 coletes) em busca de flag "fechado/concluído"
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

    // Primeiro: buscar TODOS os campos disponíveis do tipo Order
    console.log('📋 Buscando TODOS os campos do tipo Order...\n');

    const schema = await graphqlRequest(`
      query {
        __type(name: "Order") {
          fields {
            name
            type {
              name
              kind
            }
            description
          }
        }
      }
    `);

    console.log('📊 TODOS OS CAMPOS DISPONÍVEIS NO TIPO ORDER:');
    console.log('==============================================\n');

    const camposInteressantes = [];

    schema.data.__type.fields.forEach((field, index) => {
      const typeName = field.type.name || field.type.kind;
      console.log(`${index + 1}. ${field.name} (${typeName})`);

      if (field.description) {
        console.log(`   Descrição: ${field.description}`);
      }

      // Procurar campos que podem indicar "fechado/concluído"
      const nome = field.name.toLowerCase();
      if (nome.includes('close') ||
          nome.includes('fechado') ||
          nome.includes('concluido') ||
          nome.includes('concluded') ||
          nome.includes('finished') ||
          nome.includes('completed') ||
          nome.includes('active') ||
          nome.includes('archived') ||
          nome.includes('deleted') ||
          nome.includes('toggled') ||
          nome.includes('enabled') ||
          nome.includes('disabled')) {
        camposInteressantes.push({ name: field.name, type: typeName });
      }
    });

    console.log('\n\n🎯 CAMPOS POTENCIALMENTE RELACIONADOS A "FECHADO/CONCLUÍDO":');
    console.log('============================================================\n');

    if (camposInteressantes.length > 0) {
      camposInteressantes.forEach((campo, index) => {
        console.log(`${index + 1}. ${campo.name} (${campo.type})`);
      });
    } else {
      console.log('Nenhum campo óbvio encontrado. Vou buscar o pedido completo...');
    }

    // Buscar o pedido 6405 com TODOS os campos possíveis
    console.log('\n\n🔍 Consultando pedido 6405 (5573-04 coletes) com MÁXIMO de campos...\n');

    const orderQuery = await graphqlRequest(`
      query {
        order(id: "6405") {
          id
          code
          name
          created_at
          updated_at
          closed_at
          delivery_date
          discount
          shipping_value
          is_concluded
          can_be_concluded
          final_status
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
    `);

    if (!orderQuery.data || !orderQuery.data.order) {
      console.error('❌ Pedido não encontrado!');
      if (orderQuery.errors) {
        console.error('Erros:', JSON.stringify(orderQuery.errors, null, 2));
      }
      return;
    }

    console.log('✅ PEDIDO ENCONTRADO - DADOS COMPLETOS:');
    console.log('========================================\n');
    console.log(JSON.stringify(orderQuery.data.order, null, 2));

    // Buscar também um pedido recente (2025) para comparar
    console.log('\n\n🔍 Consultando pedido 8603 (0412-8667 - recente) para COMPARAÇÃO...\n');

    const orderQuery2 = await graphqlRequest(`
      query {
        order(id: "8603") {
          id
          code
          name
          created_at
          updated_at
          closed_at
          delivery_date
          discount
          shipping_value
          is_concluded
          can_be_concluded
          final_status
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
    `);

    if (orderQuery2.data && orderQuery2.data.order) {
      console.log('✅ PEDIDO RECENTE - DADOS COMPLETOS:');
      console.log('=====================================\n');
      console.log(JSON.stringify(orderQuery2.data.order, null, 2));

      // Comparação
      console.log('\n\n📊 COMPARAÇÃO ENTRE PEDIDOS:');
      console.log('=============================\n');

      const pedidoAntigo = orderQuery.data.order;
      const pedidoRecente = orderQuery2.data.order;

      console.log('Campo           | Pedido Antigo (2024)       | Pedido Recente (2025)');
      console.log('----------------|----------------------------|---------------------------');
      console.log(`is_concluded    | ${pedidoAntigo.is_concluded}                         | ${pedidoRecente.is_concluded}`);
      console.log(`can_be_concluded| ${pedidoAntigo.can_be_concluded}                         | ${pedidoRecente.can_be_concluded}`);
      console.log(`closed_at       | ${pedidoAntigo.closed_at || 'null'}                    | ${pedidoRecente.closed_at || 'null'}`);
      console.log(`final_status    | ${pedidoAntigo.final_status || 'null'}                    | ${pedidoRecente.final_status || 'null'}`);
      console.log(`status.id       | ${pedidoAntigo.status.id}                            | ${pedidoRecente.status.id}`);
      console.log(`status.text     | ${pedidoAntigo.status.text}  | ${pedidoRecente.status.text}`);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

main();
