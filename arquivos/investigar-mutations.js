// Investigar mutations disponíveis na API GraphQL
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

    console.log('🔍 DESCOBRINDO TODAS AS MUTATIONS DISPONÍVEIS:');
    console.log('===============================================\n');

    const introspection = await graphqlRequest(`
      query {
        __schema {
          mutationType {
            fields {
              name
              description
              args {
                name
                type {
                  name
                  kind
                  ofType {
                    name
                    kind
                  }
                }
              }
            }
          }
        }
      }
    `);

    const mutations = introspection.data.__schema.mutationType.fields;

    console.log(`✅ Total de ${mutations.length} mutations disponíveis:\n`);

    // Filtrar mutations relacionadas a pedidos/orders
    const orderMutations = mutations.filter(m =>
      m.name.toLowerCase().includes('order') ||
      m.name.toLowerCase().includes('pedido') ||
      m.name.toLowerCase().includes('status')
    );

    if (orderMutations.length > 0) {
      console.log('🎯 MUTATIONS RELACIONADAS A PEDIDOS/STATUS:');
      console.log('===========================================\n');
      orderMutations.forEach((mut, index) => {
        console.log(`${index + 1}. ${mut.name}`);
        if (mut.description) {
          console.log(`   Descrição: ${mut.description}`);
        }
        if (mut.args && mut.args.length > 0) {
          console.log('   Argumentos:');
          mut.args.forEach(arg => {
            const typeName = arg.type.ofType?.name || arg.type.name || arg.type.kind;
            console.log(`     - ${arg.name}: ${typeName}`);
          });
        }
        console.log('');
      });
    }

    console.log('\n📋 TODAS AS MUTATIONS DO SISTEMA:');
    console.log('==================================\n');
    mutations.forEach((mut, index) => {
      console.log(`${index + 1}. ${mut.name}`);
      if (mut.description) {
        console.log(`   Descrição: ${mut.description}`);
      }
      if (mut.args && mut.args.length > 0) {
        const argsStr = mut.args.map(a => {
          const typeName = a.type.ofType?.name || a.type.name || a.type.kind;
          return `${a.name}:${typeName}`;
        }).join(', ');
        console.log(`   Args: ${argsStr}`);
      }
      console.log('');
    });

    // Investigar o tipo UpdateOrderInput ou similar
    console.log('\n🔎 Investigando tipos relacionados a UPDATE de pedidos...');

    const updateTypes = ['UpdateOrderInput', 'OrderInput', 'UpdateOrder', 'ChangeOrderStatus'];

    for (const typeName of updateTypes) {
      try {
        const typeSchema = await graphqlRequest(`
          query {
            __type(name: "${typeName}") {
              name
              kind
              inputFields {
                name
                type {
                  name
                  kind
                  ofType {
                    name
                  }
                }
              }
            }
          }
        `);

        if (typeSchema.data.__type) {
          console.log(`\n✅ Tipo "${typeName}" encontrado!`);
          console.log(JSON.stringify(typeSchema.data.__type, null, 2));
        }
      } catch (e) {
        // Tipo não existe
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('Resposta:', error.response);
    }
  }
}

main();
