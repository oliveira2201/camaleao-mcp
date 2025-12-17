// Script para investigar campos da API do CRM
const https = require('https');

const API_URL = 'https://web-api.camaleaocamisas.com.br/graphql-api';
const EMAIL = 'api-gerente@email.com';
const PASSWORD = 'PPTDYBYqcmE7wg';

let cookies = '';

// Função para fazer POST
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
      // Capturar cookies
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
    const login = await graphqlRequest(`
      mutation {
        login(email: "${EMAIL}", password: "${PASSWORD}", remember: false) {
          id name
        }
      }
    `);
    console.log('✅ Login:', login.data.login);

    // INTROSPECTION: Descobrir TODAS as queries disponíveis
    console.log('\n\n📚 DESCOBRINDO TODAS AS QUERIES DISPONÍVEIS:');
    console.log('============================================');

    const introspection = await graphqlRequest(`
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
        }
      }
    `);

    const queries = introspection.data.__schema.queryType.fields;

    console.log(`\n✅ Total de ${queries.length} queries disponíveis:\n`);

    queries.forEach((query, index) => {
      console.log(`${index + 1}. ${query.name}`);
      if (query.description) {
        console.log(`   Descrição: ${query.description}`);
      }
      if (query.args && query.args.length > 0) {
        console.log(`   Argumentos: ${query.args.map(a => `${a.name} (${a.type.name || a.type.kind})`).join(', ')}`);
      }
      console.log('');
    });

    // INVESTIGAR productionPanel (query #52 - parece ser a Esteira de Produção!)
    console.log('\n\n🏭 INVESTIGANDO productionPanel (Esteira de Produção):');
    console.log('=====================================================');

    // Primeiro: descobrir estrutura do tipo SectorData
    const sectorDataSchema = await graphqlRequest(`
      query {
        __type(name: "SectorData") {
          fields {
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
    `);

    console.log('\n📊 Campos disponíveis no tipo SectorData:');
    sectorDataSchema.data.__type.fields.forEach(field => {
      const typeName = field.type.ofType?.name || field.type.name || field.type.kind;
      console.log(`  - ${field.name} (${typeName})`);
    });

    // Agora buscar productionPanel com os campos corretos
    try {
      const productionPanelQuery = await graphqlRequest(`
        query {
          productionPanel {
            sector {
              id
              text
            }
            orders {
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

      console.log('\n✅ productionPanel retornou dados!');
      console.log(JSON.stringify(productionPanelQuery.data.productionPanel, null, 2).substring(0, 2000));

      if (productionPanelQuery.data && productionPanelQuery.data.productionPanel) {
        console.log(`\nTotal de pedidos: ${productionPanelQuery.data.productionPanel.length}`);

      // Procurar pedido 0412-8667
      const pedido8667 = productionPanelQuery.data.productionPanel.find(p =>
        p.code && p.code.includes('8667')
      );

      if (pedido8667) {
        console.log('\n🎯 PEDIDO 0412-8667 ENCONTRADO via productionPanel!');
        console.log(JSON.stringify(pedido8667, null, 2));
      } else {
        console.log('\n❌ Pedido 0412-8667 não encontrado no productionPanel');
      }

      // Mostrar primeiros 5 pedidos
      console.log('\n📦 Primeiros 5 pedidos do productionPanel:');
      productionPanelQuery.data.productionPanel.slice(0, 5).forEach((p, i) => {
        console.log(`\n${i + 1}. Pedido ${p.code}`);
        console.log(`   Status: ${p.status?.text || 'N/A'}`);
        console.log(`   Cliente: ${p.client?.name || 'N/A'}`);
        console.log(`   Atualizado: ${p.updated_at}`);
      });

      // Agrupar por status
      const porStatus = {};
      productionPanelQuery.data.productionPanel.forEach(p => {
        const statusText = p.status?.text || 'Sem Status';
        porStatus[statusText] = (porStatus[statusText] || 0) + 1;
      });

      console.log('\n\n📊 PEDIDOS POR STATUS no productionPanel:');
      Object.entries(porStatus).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} pedidos`);
      });
      }

    } catch (error) {
      console.error('\n❌ Erro ao buscar productionPanel:', error.message);
    }

    console.log('\n📋 Buscando schema do tipo Order...');
    const schema = await graphqlRequest(`
      query {
        __type(name: "Order") {
          fields {
            name
            type {
              name
              kind
            }
          }
        }
      }
    `);

    console.log('\n📊 CAMPOS DISPONÍVEIS NO TIPO ORDER:');
    console.log('=====================================');
    schema.data.__type.fields.forEach(field => {
      console.log(`- ${field.name} (${field.type.name || field.type.kind})`);
    });

    console.log('\n🔍 Buscando pedidos com status (várias páginas)...');
    const allStatuses = new Map();

    // Buscar 5 páginas para pegar diversos status
    for (let page = 1; page <= 5; page++) {
      const orders = await graphqlRequest(`
        query {
          orders(first: 50, page: ${page}) {
            data {
              status {
                id
                text
              }
            }
          }
        }
      `);

      orders.data.orders.data.forEach(order => {
        if (order.status) {
          allStatuses.set(order.status.id, order.status.text);
        }
      });
    }

    console.log('\n📊 TODOS OS STATUS ENCONTRADOS NO SISTEMA:');
    console.log('==========================================');
    const sortedStatuses = Array.from(allStatuses.entries()).sort((a, b) => a[0] - b[0]);
    sortedStatuses.forEach(([id, text]) => {
      console.log(`  [ID ${id}] ${text}`);
    });

    // Buscar pedidos com status "Cadastrado"
    console.log('\n\n🔍 Buscando pedidos com status "Cadastrado"...');
    let pedidosCadastrados = [];

    for (let page = 1; page <= 10; page++) {
      const orders = await graphqlRequest(`
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
            }
          }
        }
      `);

      const cadastrados = orders.data.orders.data.filter(order =>
        order.status && order.status.text && order.status.text.toLowerCase().includes('cadastrado')
      );

      pedidosCadastrados = pedidosCadastrados.concat(cadastrados);

      if (orders.data.orders.data.length < 100) break;
    }

    console.log(`\n✅ Total encontrado: ${pedidosCadastrados.length} pedidos com status contendo "Cadastrado"`);

    if (pedidosCadastrados.length > 0) {
      // Ordenar por data de atualização (mais recente primeiro)
      pedidosCadastrados.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

      console.log('\n📅 TOP 5 PEDIDOS CADASTRADOS MAIS RECENTES:');
      pedidosCadastrados.slice(0, 5).forEach((order, index) => {
        const updatedAt = new Date(order.updated_at);
        const hoje = new Date();
        const diasParado = Math.floor((hoje - updatedAt) / (1000 * 60 * 60 * 24));

        console.log(`\n${index + 1}. Pedido ${order.code}`);
        console.log(`   ID: ${order.id}`);
        console.log(`   Status: ${order.status.text}`);
        console.log(`   Criado: ${order.created_at}`);
        console.log(`   Última atualização: ${order.updated_at}`);
        console.log(`   Dias desde última atualização: ${diasParado}`);
      });

      // Procurar especificamente por 0412-8667
      const pedido8667 = pedidosCadastrados.find(o => o.code && o.code.includes('0412-8667'));
      if (pedido8667) {
        console.log('\n\n🎯 PEDIDO 0412-8667 ENCONTRADO!');
        console.log(`Código: ${pedido8667.code}`);
        console.log(`ID: ${pedido8667.id}`);
        console.log(`Status: ${pedido8667.status.text}`);
        console.log(`Criado: ${pedido8667.created_at}`);
        console.log(`Atualizado: ${pedido8667.updated_at}`);
      }
    }

    // Buscar TODOS os pedidos com status "Costurado e Embalado" (múltiplas páginas)
    console.log('\n\n🔍 Buscando TODOS os pedidos com status "Costurado e Embalado"...');

    let todosPedidos = [];
    for (let page = 1; page <= 10; page++) {
      const orders = await graphqlRequest(`
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
            }
          }
        }
      `);

      const costurado = orders.data.orders.data.filter(order =>
        order.status && order.status.text === 'Costurado e Embalado'
      );

      todosPedidos = todosPedidos.concat(costurado);

      if (orders.data.orders.data.length < 100) break; // Última página
    }

    console.log(`\n✅ Total encontrado: ${todosPedidos.length} pedidos com status "Costurado e Embalado"`);

    // Ordenar por data de atualização (mais recente primeiro)
    todosPedidos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    console.log('\n📅 PEDIDO MAIS RECENTE:');
    console.log('======================');
    if (todosPedidos.length > 0) {
      const maisRecente = todosPedidos[0];
      console.log(`Código: ${maisRecente.code}`);
      console.log(`ID: ${maisRecente.id}`);
      console.log(`Criado em: ${maisRecente.created_at}`);
      console.log(`Última atualização: ${maisRecente.updated_at}`);
      console.log(`Status: ${maisRecente.status.text}`);
    }

    console.log('\n\n📅 TOP 10 PEDIDOS MAIS RECENTES:');
    console.log('================================');
    todosPedidos.slice(0, 10).forEach((order, index) => {
      const updatedAt = new Date(order.updated_at);
      const hoje = new Date();
      const diasParado = Math.floor((hoje - updatedAt) / (1000 * 60 * 60 * 24));

      console.log(`\n${index + 1}. Pedido ${order.code}`);
      console.log(`   ID: ${order.id}`);
      console.log(`   Criado: ${order.created_at}`);
      console.log(`   Última atualização: ${order.updated_at}`);
      console.log(`   Parado há: ${diasParado} dias`);
    });

    // Calcular quantos estão parados há mais de 2 dias
    const hoje = new Date();
    const pedidosParados = todosPedidos.filter(order => {
      const updatedAt = new Date(order.updated_at);
      const diasParado = Math.floor((hoje - updatedAt) / (1000 * 60 * 60 * 24));
      return diasParado > 2;
    });

    console.log(`\n\n⚠️  RESUMO:`);
    console.log('==========');
    console.log(`Total de pedidos "Costurado e Embalado": ${todosPedidos.length}`);
    console.log(`Parados há mais de 2 dias: ${pedidosParados.length}`);

    // Procurar pedido com código contendo "8667"
    console.log('\n\n🔎 PROCURANDO PEDIDOS COM "8667" NO CÓDIGO:');
    console.log('============================================');

    // Buscar nas 50 primeiras páginas
    let pedidosEncontrados = [];

    for (let page = 1; page <= 50; page++) {
      const allOrdersQuery = await graphqlRequest(`
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
            }
          }
        }
      `);

      const found = allOrdersQuery.data.orders.data.filter(o =>
        o.code && o.code.includes('8667')
      );

      if (found.length > 0) {
        pedidosEncontrados = pedidosEncontrados.concat(found);
        console.log(`\n✅ Encontrados ${found.length} pedido(s) na página ${page}:`);
        found.forEach(p => {
          console.log(`   - Código: ${p.code} | Status: ${p.status?.text || 'N/A'} | Atualizado: ${p.updated_at}`);
        });
      }

      if (allOrdersQuery.data.orders.data.length < 100) {
        console.log(`\n📄 Última página alcançada: ${page}`);
        break;
      }
    }

    if (pedidosEncontrados.length === 0) {
      console.log('\n❌ Nenhum pedido com "8667" encontrado nas primeiras 50 páginas (5000 pedidos)');
    } else {
      console.log(`\n\n📊 TOTAL: ${pedidosEncontrados.length} pedido(s) encontrado(s) com "8667"`);
      console.log('\nDetalhes completos:');
      pedidosEncontrados.forEach((p, i) => {
        const updatedAt = new Date(p.updated_at);
        const hoje = new Date();
        const diasParado = Math.floor((hoje - updatedAt) / (1000 * 60 * 60 * 24));

        console.log(`\n${i + 1}. Código: ${p.code}`);
        console.log(`   ID: ${p.id}`);
        console.log(`   Status: ${p.status?.text || 'N/A'}`);
        console.log(`   Criado: ${p.created_at}`);
        console.log(`   Última atualização: ${p.updated_at}`);
        console.log(`   Parado há: ${diasParado} dias`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

main();
