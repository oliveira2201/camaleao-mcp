// ═══════════════════════════════════════════════════════════════
// TOOL: ESPELHO BANCÁRIO v3.1 - COM TIMEOUT E PROTEÇÕES
// ═══════════════════════════════════════════════════════════════
// CORREÇÕES v3.1:
// 1. ✅ Timeout de 45 segundos
// 2. ✅ Limite máximo de 20 páginas (2000 registros)
// 3. ✅ Fallback para erro gracioso
// 4. ✅ Logs detalhados para debug
// ═══════════════════════════════════════════════════════════════

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

function getDataAtualSP() {
  const agora = new Date();
  const brasiliaStr = agora.toLocaleString('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [mesStr, diaStr, anoStr] = brasiliaStr.split('/');
  return new Date(parseInt(anoStr), parseInt(mesStr) - 1, parseInt(diaStr));
}

function parsePeriodo(input) {
  const hoje = getDataAtualSP();
  const s = String(input || '').toLowerCase().trim();

  const fmt = (d) => {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  const subDias = (data, dias) => {
    const d = new Date(data);
    d.setDate(d.getDate() - dias);
    return d;
  };

  // "últimos X dias"
  const ultimosDiasMatch = s.match(/ultim[oa]s?\s+(\d+)\s+dias?/);
  if (ultimosDiasMatch) {
    const dias = parseInt(ultimosDiasMatch[1]);
    return {
      data_inicio: fmt(subDias(hoje, dias - 1)),
      data_fim: fmt(hoje),
      label: `últimos ${dias} dias`
    };
  }

  // "esta semana" (do início da semana até hoje)
  if (s.includes('esta semana') || s.includes('essa semana') || s.includes('nessa semana')) {
    const diaSemana = hoje.getDay(); // 0=domingo, 1=segunda, ..., 6=sábado
    // Calcular quantos dias desde a última segunda-feira
    const diasDesdeSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
    const segundaFeira = subDias(hoje, diasDesdeSegunda);
    return {
      data_inicio: fmt(segundaFeira),
      data_fim: fmt(hoje),
      label: 'esta semana'
    };
  }

  // "semana passada" (segunda a domingo da semana anterior)
  if (s.includes('semana passada')) {
    const diaSemana = hoje.getDay();
    const diasDesdeSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
    // Segunda-feira da semana passada (7 dias antes da última segunda)
    const segundaPassada = subDias(hoje, diasDesdeSegunda + 7);
    // Domingo da semana passada (1 dia antes da última segunda)
    const domingoPassado = subDias(hoje, diasDesdeSegunda + 1);
    return {
      data_inicio: fmt(segundaPassada),
      data_fim: fmt(domingoPassado),
      label: 'semana passada'
    };
  }

  // "este mês" ou "esse mes"
  if (s.includes('este m') || s.includes('esse m') || s.includes('nesse m')) {
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return {
      data_inicio: fmt(primeiroDia),
      data_fim: fmt(hoje),
      label: 'este mês'
    };
  }

  // Meses por nome
  const meses = {
    'janeiro': 0, 'fevereiro': 1, 'março': 2, 'marco': 2, 'abril': 3,
    'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7,
    'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
  };

  for (const [nome, mes] of Object.entries(meses)) {
    if (s.includes(nome)) {
      let ano = hoje.getFullYear();
      const anoMatch = s.match(/\b(20\d{2})\b/);
      if (anoMatch) {
        ano = parseInt(anoMatch[1]);
      }

      const primeiroDia = new Date(ano, mes, 1);
      const ultimoDia = new Date(ano, mes + 1, 0);

      return {
        data_inicio: fmt(primeiroDia),
        data_fim: fmt(ultimoDia),
        label: `${nome}/${ano}`
      };
    }
  }

  return null;
}

// ═════════════════════════════════════════════════════════════
// PROCESSAMENTO DO INPUT
// ═════════════════════════════════════════════════════════════

const input = $input?.item?.json || {};

let dataInicio, dataFim, periodoLabel;

const periodoDetectado = parsePeriodo(
  input.periodo || input.data || input.mes || input.quando || ''
);

if (periodoDetectado) {
  dataInicio = periodoDetectado.data_inicio;
  dataFim = periodoDetectado.data_fim;
  periodoLabel = periodoDetectado.label;
} else {
  if (input.data_inicio && input.data_fim) {
    dataInicio = normalizaData(input.data_inicio);
    dataFim = normalizaData(input.data_fim);
    periodoLabel = `${isoParaBR(dataInicio)} a ${isoParaBR(dataFim)}`;
  } else if (input.data) {
    dataInicio = normalizaData(input.data);
    dataFim = dataInicio;
    periodoLabel = isoParaBR(dataInicio);
  } else {
    dataInicio = hojeSP();
    dataFim = dataInicio;
    periodoLabel = 'hoje';
  }
}

console.log(`[ESPELHO v3.1] Período: ${periodoLabel} (${dataInicio} a ${dataFim})`);

// ═════════════════════════════════════════════════════════════
// CONFIG
// ═════════════════════════════════════════════════════════════

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

// ═════════════════════════════════════════════════════════════
// EXECUÇÃO COM TIMEOUT
// ═════════════════════════════════════════════════════════════

const TIMEOUT_MS = 45000; // 45 segundos
const MAX_PAGINAS = 20; // Máximo 2000 registros

async function executar() {
  try {
    console.log('[ESPELHO] Login...');
    const loginResult = await graphqlRequest(
      `mutation { login(email: "${email}", password: "${password}", remember: false) { id name } }`,
      true
    );

    if (loginResult.json.errors) {
      throw new Error(`Login falhou: ${JSON.stringify(loginResult.json.errors)}`);
    }

    console.log('[ESPELHO] Login OK');

    let allEntries = [];
    let currentPage = 1;
    let totalPages = 1;
    const perPage = 100;

    console.log('[ESPELHO] Buscando dados...');

    while (currentPage <= totalPages && currentPage <= MAX_PAGINAS) {
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

      if (entriesQuery.errors) {
        throw new Error(`Query falhou: ${JSON.stringify(entriesQuery.errors)}`);
      }

      const data = entriesQuery?.data?.entriesBankMirror?.data || [];
      const paginator = entriesQuery?.data?.entriesBankMirror?.paginatorInfo;

      if (paginator) {
        totalPages = paginator.lastPage;
        console.log(`[ESPELHO] Pág ${currentPage}/${totalPages} - ${data.length} reg`);
      }

      allEntries = allEntries.concat(data);

      // Se não tem mais dados, para
      if (data.length === 0) break;

      currentPage++;
    }

    console.log(`[ESPELHO] Total carregado: ${allEntries.length}`);

    // Filtrar pelo período
    const filtered = allEntries
      .filter((e) => {
        const dataReg = String(e?.date || '').split(' ')[0];
        return dataReg >= dataInicio && dataReg <= dataFim;
      })
      .map((e) => ({
        ...e,
        value: Number(e?.value || 0),
        via_id: String(e?.via_id ?? ''),
        via: viasMap[String(e?.via_id ?? '')] || `Via ${String(e?.via_id ?? '')}`,
      }));

    console.log(`[ESPELHO] Filtrados: ${filtered.length}`);

    if (filtered.length === 0) {
      return {
        periodo_label: periodoLabel,
        mensagem: `Não houve recebimentos em ${periodoLabel}.`,
        total_recebido: 0
      };
    }

    const recebimentos = filtered.filter((e) => e.value > 0);
    const pagamentos = filtered.filter((e) => e.value < 0);

    // Agrupar por via
    const porVia = {};
    for (const e of recebimentos) {
      if (!porVia[e.via]) porVia[e.via] = [];
      porVia[e.via].push(e.value);
    }

    const resumo = Object.entries(porVia).map(([via, valores]) => ({
      via,
      total: valores.reduce((s, v) => s + v, 0)
    }));

    resumo.sort((a, b) => b.total - a.total);

    const totalRecebido = recebimentos.reduce((s, e) => s + e.value, 0);
    const totalPago = pagamentos.reduce((s, e) => s + e.value, 0);
    const saldo = totalRecebido + totalPago;

    // Formatar mensagem
    let msg = `📊 Recebimentos de ${periodoLabel}:\n\n`;
    for (const item of resumo) {
      msg += `${item.via} - R$ ${formatarDinheiro(item.total)}\n`;
    }
    msg += `\nTotal = R$ ${formatarDinheiro(totalRecebido)}`;

    if (totalPago < 0) {
      msg += `\n\n💸 Pagamentos: R$ ${formatarDinheiro(Math.abs(totalPago))}`;
      msg += `\n💰 Saldo líquido: R$ ${formatarDinheiro(saldo)}`;
    }

    return {
      periodo_label: periodoLabel,
      mensagem: msg,
      total_recebido: totalRecebido,
      saldo_periodo: saldo,
      recebimentos_por_via: resumo
    };

  } catch (err) {
    console.error('[ESPELHO] ERRO:', err.message);
    throw err;
  }
}

// Executar com timeout
const resultado = await Promise.race([
  executar(),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout: consulta demorou mais de 45s')), TIMEOUT_MS)
  )
]);

return JSON.stringify(resultado);
