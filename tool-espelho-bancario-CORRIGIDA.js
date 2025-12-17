// ═══════════════════════════════════════════════════════════════
// TOOL: ESPELHO BANCÁRIO - VERSÃO CORRIGIDA
// ═══════════════════════════════════════════════════════════════
// CORREÇÕES:
// 1. ✅ Usa 'first' ao invés de 'limit' na query GraphQL
// 2. ✅ Adiciona tratamento de erros
// 3. ✅ Busca TODAS as páginas necessárias (não só a primeira)
// 4. ✅ Logs detalhados para debug
// ═══════════════════════════════════════════════════════════════

// Helpers de data (timezone SP)
function hojeSP() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function normalizaData(raw) {
  const s = String(raw || '').trim();
  if (!s || ['hoje','hj'].includes(s.toLowerCase())) return hojeSP();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  return hojeSP();
}

function isoParaBR(iso) {
  const [y, m, d] = String(iso).split('-');
  if (!y || !m || !d) return String(iso);
  return `${d}/${m}/${y}`;
}

// Pegue a data do input
const rawDate =
  $input?.item?.json?.data ??
  $input?.item?.json?.date ??
  $input?.item?.json?.dia ??
  null;

const dataISO = normalizaData(rawDate);
const dataBR = isoParaBR(dataISO);

console.log(`[ESPELHO] Buscando dados para: ${dataBR} (${dataISO})`);

// Config
const apiUrl = 'https://web-api.camaleaocamisas.com.br/graphql-api';
const email = 'api-gerente@email.com';
const password = 'PPTDYBYqcmE7wg';

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

let cookies = '';
const httpRequest = this.helpers.httpRequest.bind(this.helpers);

async function graphqlRequest(query, full = false) {
  const res = await httpRequest({
    method: 'POST',
    url: apiUrl,
    headers: {
      'Content-Type': 'application/json',
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body: { query },
    returnFullResponse: true,
  });

  const setCookie = res?.headers?.['set-cookie'];
  if (setCookie) {
    cookies = Array.isArray(setCookie)
      ? setCookie.map((c) => String(c).split(';')[0]).join('; ')
      : String(setCookie).split(';')[0];
  }

  const body = res.body;
  const jsonBody = typeof body === 'string' ? JSON.parse(body) : body;

  return full ? { ...res, json: jsonBody } : jsonBody;
}

try {
  // ═══════════════════════════════════════════════════════════
  // 1. LOGIN
  // ═══════════════════════════════════════════════════════════
  console.log('[ESPELHO] Fazendo login...');
  const loginResult = await graphqlRequest(
    `mutation { login(email: "${email}", password: "${password}", remember: false) { id name } }`,
    true
  );

  if (loginResult.json.errors) {
    throw new Error(`Erro no login: ${JSON.stringify(loginResult.json.errors)}`);
  }

  console.log('[ESPELHO] Login OK -', loginResult.json.data?.login?.name);

  // ═══════════════════════════════════════════════════════════
  // 2. BUSCAR ENTRADAS (TODAS AS PÁGINAS NECESSÁRIAS)
  // ═══════════════════════════════════════════════════════════
  console.log('[ESPELHO] Buscando entradas do espelho bancário...');

  let allEntries = [];
  let currentPage = 1;
  let totalPages = 1;
  const perPage = 100;

  // Loop para buscar todas as páginas (limitado a 5 páginas para não sobrecarregar)
  while (currentPage <= totalPages && currentPage <= 5) {
    const entriesQuery = await graphqlRequest(
      `query {
        entriesBankMirror(first: ${perPage}, page: ${currentPage}) {
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

    // ✅ VERIFICAR SE HÁ ERROS
    if (entriesQuery.errors) {
      throw new Error(`Erro na query: ${JSON.stringify(entriesQuery.errors)}`);
    }

    const data = entriesQuery?.data?.entriesBankMirror?.data || [];
    const paginator = entriesQuery?.data?.entriesBankMirror?.paginatorInfo;

    allEntries = allEntries.concat(data);

    if (paginator) {
      totalPages = paginator.lastPage;
      console.log(`[ESPELHO] Página ${currentPage}/${totalPages} - ${data.length} registros`);
    }

    // Só busca próxima página se encontrou entradas da data procurada
    const hasTargetDate = data.some(e => String(e?.date || '').split(' ')[0] === dataISO);
    if (!hasTargetDate && currentPage > 1) {
      console.log(`[ESPELHO] Nenhuma entrada da data ${dataISO} nesta página. Parando busca.`);
      break;
    }

    currentPage++;
  }

  console.log(`[ESPELHO] Total de registros carregados: ${allEntries.length}`);

  // ═══════════════════════════════════════════════════════════
  // 3. FILTRAR PELA DATA
  // ═══════════════════════════════════════════════════════════
  const filtered = allEntries
    .filter((e) => String(e?.date || '').split(' ')[0] === dataISO)
    .map((e) => ({
      ...e,
      value: Number(e?.value || 0),
      via_id: String(e?.via_id ?? ''),
      via: viasMap[String(e?.via_id ?? '')] || `Via ${String(e?.via_id ?? '')}`,
    }));

  console.log(`[ESPELHO] Entradas encontradas para ${dataISO}: ${filtered.length}`);

  const recebimentos = filtered.filter((e) => e.value > 0);
  const pagamentos = filtered.filter((e) => e.value < 0);

  // ═══════════════════════════════════════════════════════════
  // 4. CALCULAR TOTAIS
  // ═══════════════════════════════════════════════════════════
  const recebimentosPorVia = {};
  for (const entry of recebimentos) {
    const viaName = entry.via;
    if (!recebimentosPorVia[viaName]) recebimentosPorVia[viaName] = [];
    recebimentosPorVia[viaName].push(entry.value);
  }

  const resumoRecebimentos = Object.entries(recebimentosPorVia).map(
    ([via, valores]) => ({
      via,
      quantidade: valores.length,
      total: valores.reduce((s, v) => s + v, 0),
    })
  );

  const totalRecebido = recebimentos.reduce((s, e) => s + Number(e.value || 0), 0);
  const totalPago = pagamentos.reduce((s, e) => s + Number(e.value || 0), 0);
  const saldoDoDia = totalRecebido + totalPago;

  // Detalhes por tipo
  const pixTotal =
    resumoRecebimentos.find((r) => r.via.toLowerCase().includes('pix'))?.total || 0;

  const cartaoTotal = resumoRecebimentos
    .filter((r) => r.via.includes('Cartão') || r.via.includes('Mercado Pago'))
    .reduce((s, r) => s + r.total, 0);

  const dinheiroTotal =
    resumoRecebimentos.find((r) => r.via === 'Dinheiro')?.total || 0;

  console.log(`[ESPELHO] PIX: R$ ${pixTotal} | Cartão: R$ ${cartaoTotal} | Dinheiro: R$ ${dinheiroTotal}`);
  console.log(`[ESPELHO] Saldo do dia: R$ ${saldoDoDia}`);

  // ═══════════════════════════════════════════════════════════
  // 5. MENSAGEM PARA O AGENTE
  // ═══════════════════════════════════════════════════════════
  const msgPix =
    pixTotal > 0
      ? `Caiu PIX hoje (${dataBR}): R$ ${pixTotal.toFixed(2).replace('.', ',')}.`
      : `Não caiu nenhum PIX hoje (${dataBR}).`;

  const msgSaldo = `O saldo total do dia é R$ ${saldoDoDia.toFixed(2).replace('.', ',')}.`;

  // ═══════════════════════════════════════════════════════════
  // 6. RETORNO
  // ═══════════════════════════════════════════════════════════
  return JSON.stringify({
    data_iso: dataISO,
    data_br: dataBR,
    total_entradas: filtered.length,
    total_recebido: totalRecebido,
    total_pago: totalPago,
    saldo_do_dia: saldoDoDia,
    saldo_do_dia_formatado: `R$ ${saldoDoDia.toFixed(2).replace('.', ',')}`,
    recebimentos_por_via: resumoRecebimentos,
    detalhes: {
      pix: pixTotal,
      cartao: cartaoTotal,
      dinheiro: dinheiroTotal,
    },
    mensagem_resumo: `${msgPix} ${msgSaldo}`,
    itens: filtered,
  });

} catch (err) {
  console.error('[ESPELHO] ERRO:', err.message);
  return JSON.stringify({
    erro: true,
    data_iso: dataISO,
    data_br: dataBR,
    mensagem: `Erro ao buscar espelho bancário: ${err.message}`,
  });
}
