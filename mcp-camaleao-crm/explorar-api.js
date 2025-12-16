// Explorar schema GraphQL da API Camaleão
const https = require('https');

const apiUrl = 'https://web-api.camaleaocamisas.com.br/graphql-api';
const email = 'api-gerente@email.com';
const password = 'PPTDYBYqcmE7wg';

let cookies = '';

function graphqlRequest(query) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...(cookies ? { 'Cookie': cookies } : {})
      }
    };

    const req = https.request(apiUrl, options, (res) => {
      let data = '';

      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        cookies = Array.isArray(setCookie)
          ? setCookie.map(c => c.split(';')[0]).join('; ')
          : setCookie.split(';')[0];
      }

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function explorarAPI() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 EXPLORANDO API GRAPHQL - CAMALEÃO CRM');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Login
  console.log('📝 Fazendo login...');
  const loginResult = await graphqlRequest(
    `mutation { login(email: "${email}", password: "${password}", remember: false) { id name } }`
  );

  if (loginResult.errors) {
    console.error('❌ Erro no login:', loginResult.errors);
    return;
  }
  console.log('✅ Login OK:', loginResult.data.login.name);
  console.log('');

  // 2. Introspection - descobrir schema
  console.log('🔎 Fazendo introspection do schema GraphQL...\n');

  const introspectionQuery = `
    query {
      __schema {
        queryType {
          fields {
            name
            description
            args {
              name
              type {
                name
                kind
              }
            }
          }
        }
        mutationType {
          fields {
            name
            description
          }
        }
      }
    }
  `;

  const schemaResult = await graphqlRequest(introspectionQuery);

  if (schemaResult.errors) {
    console.error('❌ Erro na introspection:', schemaResult.errors);
    return;
  }

  console.log('📊 QUERIES DISPONÍVEIS:\n');
  const queries = schemaResult.data.__schema.queryType.fields;

  // Filtrar queries mais relevantes
  const relevantQueries = queries.filter(q =>
    !q.name.startsWith('__') &&
    (q.name.toLowerCase().includes('order') ||
     q.name.toLowerCase().includes('pedido') ||
     q.name.toLowerCase().includes('payment') ||
     q.name.toLowerCase().includes('pagamento') ||
     q.name.toLowerCase().includes('client') ||
     q.name.toLowerCase().includes('customer') ||
     q.name.toLowerCase().includes('product') ||
     q.name.toLowerCase().includes('produto') ||
     q.name.toLowerCase().includes('bank') ||
     q.name.toLowerCase().includes('entries') ||
     q.name.toLowerCase().includes('user') ||
     q.name.toLowerCase().includes('sale') ||
     q.name.toLowerCase().includes('venda') ||
     q.name.toLowerCase().includes('stock') ||
     q.name.toLowerCase().includes('estoque'))
  );

  for (const query of relevantQueries) {
    console.log(`  📌 ${query.name}`);
    if (query.description) {
      console.log(`     ${query.description}`);
    }
    if (query.args && query.args.length > 0) {
      console.log(`     Argumentos: ${query.args.map(a => a.name).join(', ')}`);
    }
    console.log('');
  }

  console.log('\n📊 MUTATIONS DISPONÍVEIS:\n');
  const mutations = schemaResult.data.__schema.mutationType.fields;

  const relevantMutations = mutations.filter(m =>
    !m.name.startsWith('__') &&
    (m.name.toLowerCase().includes('create') ||
     m.name.toLowerCase().includes('update') ||
     m.name.toLowerCase().includes('delete') ||
     m.name.toLowerCase().includes('order') ||
     m.name.toLowerCase().includes('pedido'))
  );

  for (const mutation of relevantMutations) {
    console.log(`  📌 ${mutation.name}`);
    if (mutation.description) {
      console.log(`     ${mutation.description}`);
    }
    console.log('');
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ Exploração concluída!');
  console.log('═══════════════════════════════════════════════════════');
}

explorarAPI().catch(console.error);
