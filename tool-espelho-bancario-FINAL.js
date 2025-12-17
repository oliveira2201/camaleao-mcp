// ═══════════════════════════════════════════════════════════════
// TOOL: ESPELHO BANCÁRIO - VERSÃO FINAL
// ═══════════════════════════════════════════════════════════════
// MELHORIAS:
// 1. ✅ Usa 'first' ao invés de 'limit' (correção bug crítico)
// 2. ✅ Tratamento de erros GraphQL
// 3. ✅ Busca múltiplas páginas
// 4. ✅ Resposta formatada por via (Cora, Dinheiro, etc)
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

function formatarDinheiro(valor) {
  return valor.toFixed(2).replace('.', ',');
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
  '6': 'Cora',
  '7': 'Banco Inter',
  '8': 'Mercado Pago',
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
  // 2. BUSCAR ENTRADAS (MÚLTIPLAS PÁGINAS)
  // ═══════════════════════════════════════════════════════════
  console.log('[ESPELHO] Buscando entradas do espelho bancário...');

  let allEntries = [];
  let currentPage = 1;
  let totalPages = 1;
  const perPage = 100;

  // Loop para buscar até 5 páginas
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

  if (filtered.length === 0) {
    return JSON.stringify({
      data_iso: dataISO,
      data_br: dataBR,
      mensagem: `Não houve recebimentos em ${dataBR}.`,
      total_recebido: 0,
      saldo_do_dia: 0,
      detalhes: []
    });
  }

  const recebimentos = filtered.filter((e) => e.value > 0);
  const pagamentos = filtered.filter((e) => e.value < 0);

  // ═══════════════════════════════════════════════════════════
  // 4. AGRUPAR RECEBIMENTOS POR VIA
  // ═══════════════════════════════════════════════════════════
  const recebimentosPorVia = {};

  for (const entry of recebimentos) {
    const viaName = entry.via;
    if (!recebimentosPorVia[viaName]) {
      recebimentosPorVia[viaName] = [];
    }
    recebimentosPorVia[viaName].push(entry.value);
  }

  const resumoRecebimentos = Object.entries(recebimentosPorVia).map(
    ([via, valores]) => ({
      via,
      quantidade: valores.length,
      total: valores.reduce((s, v) => s + v, 0),
    })
  );

  // Ordenar por valor (maior primeiro)
  resumoRecebimentos.sort((a, b) => b.total - a.total);

  const totalRecebido = recebimentos.reduce((s, e) => s + e.value, 0);
  const totalPago = pagamentos.reduce((s, e) => s + e.value, 0);
  const saldoDoDia = totalRecebido + totalPago;

  console.log(`[ESPELHO] Total recebido: R$ ${totalRecebido}`);
  console.log(`[ESPELHO] Saldo do dia: R$ ${saldoDoDia}`);

  // ═══════════════════════════════════════════════════════════
  // 5. FORMATAR RESPOSTA PARA O AGENTE
  // ═══════════════════════════════════════════════════════════
  let mensagem = `📊 Recebimentos de ${dataBR}:\n\n`;

  // Listar cada via com seu total
  for (const item of resumoRecebimentos) {
    mensagem += `${item.via} - R$ ${formatarDinheiro(item.total)}\n`;
  }

  mensagem += `\nTotal = R$ ${formatarDinheiro(totalRecebido)}`;

  // Se houve pagamentos, mencionar o saldo líquido
  if (totalPago < 0) {
    mensagem += `\n\n💸 Pagamentos: R$ ${formatarDinheiro(Math.abs(totalPago))}`;
    mensagem += `\n💰 Saldo líquido do dia: R$ ${formatarDinheiro(saldoDoDia)}`;
  }

  // ═══════════════════════════════════════════════════════════
  // 6. RETORNO
  // ═══════════════════════════════════════════════════════════
  return JSON.stringify({
    data_iso: dataISO,
    data_br: dataBR,
    mensagem: mensagem,
    total_recebido: totalRecebido,
    total_pago: Math.abs(totalPago),
    saldo_do_dia: saldoDoDia,
    recebimentos_por_via: resumoRecebimentos,
    detalhes: resumoRecebimentos.map(r => ({
      via: r.via,
      valor: r.total,
      quantidade: r.quantidade
    }))
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
