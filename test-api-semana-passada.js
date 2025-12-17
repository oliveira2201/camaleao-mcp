// Teste: Buscar dados da semana passada via API
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

async function buscarDadosSemanPassada() {
  console.log('═══════════════════════════════════════════');
  console.log('TESTE: Dados da SEMANA PASSADA via API');
  console.log('═══════════════════════════════════════════\n');

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

  // 2. Buscar entradas
  console.log('📊 Buscando entradas...');
  let allEntries = [];

  for (let page = 1; page <= 3; page++) {
    const result = await graphqlRequest(
      `query {
        entriesBankMirror(first: 100, page: ${page}) {
          data {
            id
            description
            value
            date
            via_id
          }
          paginatorInfo {
            currentPage
            lastPage
            total
          }
        }
      }`
    );

    if (result.errors) {
      console.error('❌ Erro na query:', result.errors);
      return;
    }

    const entries = result.data.entriesBankMirror.data;
    allEntries = allEntries.concat(entries);

    console.log(`  Página ${page}: ${entries.length} registros`);
  }

  console.log(`✅ Total carregado: ${allEntries.length} registros\n`);

  // 3. Calcular semana passada
  const hoje = new Date();
  const diaSemana = hoje.getDay();
  const diasDesdeSegunda = diaSemana === 0 ? 6 : diaSemana - 1;

  // Segunda-feira da semana passada
  const segundaPassada = new Date(hoje);
  segundaPassada.setDate(hoje.getDate() - (diasDesdeSegunda + 7));

  // Domingo da semana passada
  const domingoPassado = new Date(hoje);
  domingoPassado.setDate(hoje.getDate() - (diasDesdeSegunda + 1));

  const fmt = (d) => {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  const dataInicio = fmt(segundaPassada);
  const dataFim = fmt(domingoPassado);

  console.log(`📅 Período: ${dataInicio} (segunda) a ${dataFim} (domingo)`);
  console.log('');

  // Filtrar entradas da semana passada
  const entriesSemana = allEntries.filter(e => {
    const dataReg = String(e.date || '').split(' ')[0];
    return dataReg >= dataInicio && dataReg <= dataFim;
  });

  console.log(`✅ Entradas encontradas: ${entriesSemana.length}\n`);

  // Separar recebimentos e pagamentos
  const recebimentos = entriesSemana.filter(e => Number(e.value) > 0);
  const pagamentos = entriesSemana.filter(e => Number(e.value) < 0);

  // Agrupar por via
  const viasMap = {
    '1': 'Caixa',
    '2': 'Banco do Brasil',
    '3': 'Nubank',
    '4': 'Dinheiro',
    '5': 'Cartão de crédito',
    '6': 'Cora',
    '7': 'Banco Inter',
    '8': 'Mercado Pago',
  };

  const porVia = {};
  for (const e of recebimentos) {
    const via = viasMap[e.via_id] || `Via ${e.via_id}`;
    if (!porVia[via]) porVia[via] = { total: 0, qtd: 0 };
    porVia[via].total += Number(e.value);
    porVia[via].qtd++;
  }

  console.log('💰 RECEBIMENTOS POR VIA:\n');
  for (const [via, data] of Object.entries(porVia)) {
    const valorFormatado = data.total.toFixed(2).replace('.', ',');
    console.log(`  ${via}: R$ ${valorFormatado} (${data.qtd} transações)`);
  }

  const totalRecebido = recebimentos.reduce((s, e) => s + Number(e.value), 0);
  const totalPago = pagamentos.reduce((s, e) => s + Number(e.value), 0);
  const saldo = totalRecebido + totalPago;

  console.log('');
  console.log('📊 RESUMO:');
  console.log(`  Total recebido: R$ ${totalRecebido.toFixed(2).replace('.', ',')}`);
  console.log(`  Total pago: R$ ${Math.abs(totalPago).toFixed(2).replace('.', ',')}`);
  console.log(`  Saldo: R$ ${saldo.toFixed(2).replace('.', ',')}`);
}

buscarDadosSemanPassada().catch(console.error);
