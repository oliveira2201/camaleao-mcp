// DEBUG: Espelho Bancário - Investigar dados da API GraphQL
// Data: 16/12/2025

const https = require('https');

const API_URL = 'https://web-api.camaleaocamisas.com.br/graphql-api';
const EMAIL = 'api-gerente@email.com';
const PASSWORD = 'PPTDYBYqcmE7wg';

let cookies = '';

function graphqlRequest(query) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...(cookies && { 'Cookie': cookies })
      }
    };

    const req = https.request(API_URL, options, (res) => {
      let data = '';

      // Capturar cookies
      if (res.headers['set-cookie']) {
        const setCookies = res.headers['set-cookie'];
        cookies = Array.isArray(setCookies)
          ? setCookies.map(c => c.split(';')[0]).join('; ')
          : setCookies.split(';')[0];
        console.log('🍪 Cookies capturados:', cookies.substring(0, 50) + '...');
      }

      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}\nData: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function debug() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 DEBUG: ESPELHO BANCÁRIO - API GRAPHQL');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // 1. LOGIN
    console.log('📝 ETAPA 1: Fazendo login...');
    const loginQuery = `mutation {
      login(email: "${EMAIL}", password: "${PASSWORD}", remember: false) {
        id name email
      }
    }`;

    const loginResult = await graphqlRequest(loginQuery);
    console.log('✅ Login bem-sucedido!');
    console.log('   Usuário:', loginResult.data?.login?.name || 'N/A');
    console.log('   ID:', loginResult.data?.login?.id || 'N/A');
    console.log('');

    // 2. BUSCAR ENTRADAS DO ESPELHO BANCÁRIO (primeira página)
    console.log('📊 ETAPA 2: Buscando entradas do espelho bancário...');
    const entriesQuery = `query {
      entriesBankMirror(first: 50, page: 1) {
        data {
          id
          description
          value
          date
          via_id
          created_at
        }
        paginatorInfo {
          currentPage
          lastPage
          total
          perPage
        }
      }
    }`;

    const entriesResult = await graphqlRequest(entriesQuery);

    if (!entriesResult.data?.entriesBankMirror) {
      console.log('❌ Erro: Nenhum dado retornado da API');
      console.log('   Response completo:', JSON.stringify(entriesResult, null, 2));
      return;
    }

    const entries = entriesResult.data.entriesBankMirror.data || [];
    const paginator = entriesResult.data.entriesBankMirror.paginatorInfo || {};

    console.log('✅ Dados recebidos!');
    console.log(`   Total de registros no sistema: ${paginator.total || 'N/A'}`);
    console.log(`   Página atual: ${paginator.currentPage || 'N/A'} de ${paginator.lastPage || 'N/A'}`);
    console.log(`   Registros retornados nesta página: ${entries.length}`);
    console.log('');

    // 3. ANALISAR FORMATO DAS DATAS
    console.log('📅 ETAPA 3: Analisando formato das datas...');
    if (entries.length > 0) {
      const sample = entries[0];
      console.log('   Exemplo de registro:');
      console.log('   - ID:', sample.id);
      console.log('   - Description:', sample.description);
      console.log('   - Value:', sample.value);
      console.log('   - Date (campo date):', sample.date);
      console.log('   - Created At:', sample.created_at);
      console.log('   - Via ID:', sample.via_id);
      console.log('');

      // Testar o split usado no código
      const dateSplit = String(sample.date || '').split(' ')[0];
      console.log('   📌 Resultado do split(\' \')[0]:', dateSplit);
      console.log('');
    }

    // 4. FILTRAR ENTRADAS DO DIA 16/12/2025
    console.log('🔎 ETAPA 4: Filtrando entradas do dia 16/12/2025...');
    const dataAlvo = '2025-12-16';

    const filteredByDate = entries.filter(e => {
      const dateStr = String(e?.date || '');
      const datePart = dateStr.split(' ')[0];
      return datePart === dataAlvo;
    });

    console.log(`   Entradas encontradas para ${dataAlvo}: ${filteredByDate.length}`);
    console.log('');

    if (filteredByDate.length > 0) {
      console.log('   📋 DETALHES DAS ENTRADAS DO DIA:');
      console.log('   ' + '─'.repeat(80));

      let totalRecebido = 0;
      let totalPago = 0;

      filteredByDate.forEach((entry, index) => {
        const valor = Number(entry.value || 0);
        const tipo = valor > 0 ? '✅ ENTRADA' : '❌ SAÍDA';

        if (valor > 0) totalRecebido += valor;
        else totalPago += valor;

        console.log(`   ${index + 1}. ${tipo}`);
        console.log(`      Via ID: ${entry.via_id}`);
        console.log(`      Valor: R$ ${valor.toFixed(2)}`);
        console.log(`      Descrição: ${entry.description || 'N/A'}`);
        console.log(`      Data/Hora: ${entry.date}`);
        console.log('');
      });

      console.log('   ' + '─'.repeat(80));
      console.log(`   💰 TOTAL RECEBIDO: R$ ${totalRecebido.toFixed(2)}`);
      console.log(`   💸 TOTAL PAGO: R$ ${totalPago.toFixed(2)}`);
      console.log(`   💵 SALDO DO DIA: R$ ${(totalRecebido + totalPago).toFixed(2)}`);
      console.log('');
    } else {
      console.log('   ⚠️ Nenhuma entrada encontrada para esta data!');
      console.log('');
      console.log('   📊 Datas disponíveis nos últimos registros:');
      entries.slice(0, 10).forEach((e, i) => {
        console.log(`      ${i + 1}. ${e.date} - Via ${e.via_id} - R$ ${e.value}`);
      });
      console.log('');
    }

    // 5. MAPEAR VIA_IDs
    console.log('🏦 ETAPA 5: Mapeando via_id usado nas entradas...');
    const viaIds = [...new Set(entries.map(e => e.via_id))].sort();
    console.log('   Via IDs encontrados:', viaIds.join(', '));
    console.log('');

    console.log('   📌 Mapeamento atual no código:');
    const viasMap = {
      '1': 'Caixa',
      '2': 'Banco do Brasil',
      '3': 'Nubank',
      '4': 'Dinheiro',
      '5': 'Cartão de crédito',
      '6': 'Cora (PIX)',
      '7': 'Banco Inter',
      '8': 'Mercado Pago (Cartão)',
    };
    Object.entries(viasMap).forEach(([id, nome]) => {
      const usado = viaIds.includes(id) ? '✅' : '❌';
      console.log(`      ${usado} ${id}: ${nome}`);
    });
    console.log('');

    // 6. VERIFICAR SE HÁ MAIS PÁGINAS
    if (paginator.lastPage > 1) {
      console.log('⚠️ ATENÇÃO: Existem múltiplas páginas de dados!');
      console.log(`   Total de páginas: ${paginator.lastPage}`);
      console.log(`   Você está vendo apenas a página 1`);
      console.log(`   Pode haver mais entradas do dia 16/12 nas outras páginas!`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error('   Stack:', error.stack);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('🏁 DEBUG CONCLUÍDO');
  console.log('═══════════════════════════════════════════════════════');
}

debug();
