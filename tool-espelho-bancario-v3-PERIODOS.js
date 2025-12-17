// ═══════════════════════════════════════════════════════════════
// TOOL: ESPELHO BANCÁRIO v3 - SUPORTE A PERÍODOS
// ═══════════════════════════════════════════════════════════════
// MELHORIAS v3:
// 1. ✅ Aceita períodos: data_inicio e data_fim
// 2. ✅ Interpreta períodos naturais: "novembro", "esta semana", "ultimos 15 dias"
// 3. ✅ Busca TODAS as páginas necessárias (não limitado a 5)
// 4. ✅ Mensagem de progresso para períodos longos
// ═══════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════
// HELPERS DE DATA
// ═════════════════════════════════════════════════════════════

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

// ═════════════════════════════════════════════════════════════
// PARSER DE PERÍODOS NATURAIS
// ═════════════════════════════════════════════════════════════

function parsePeriodo(input) {
  const hoje = getDataAtualSP();
  const s = String(input || '').toLowerCase().trim();

  // Função auxiliar para formatar data como YYYY-MM-DD
  const fmt = (d) => {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  // Função para subtrair dias
  const subDias = (data, dias) => {
    const d = new Date(data);
    d.setDate(d.getDate() - dias);
    return d;
  };

  // Padrões de período

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

  // "esta semana"
  if (s.includes('esta semana') || s.includes('essa semana')) {
    const diaSemana = hoje.getDay(); // 0 = domingo, 1 = segunda, etc
    const diasAteSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
    const segunda = subDias(hoje, diasAteSegunda);
    return {
      data_inicio: fmt(segunda),
      data_fim: fmt(hoje),
      label: 'esta semana'
    };
  }

  // "semana passada"
  if (s.includes('semana passada')) {
    const diaSemana = hoje.getDay();
    const diasAteSegundaAtual = diaSemana === 0 ? 6 : diaSemana - 1;
    const segundaPassada = subDias(hoje, diasAteSegundaAtual + 7);
    const domingoPassado = subDias(hoje, diasAteSegundaAtual + 1);
    return {
      data_inicio: fmt(segundaPassada),
      data_fim: fmt(domingoPassado),
      label: 'semana passada'
    };
  }

  // "este mês" ou "mês atual"
  if (s.includes('este m') || s.includes('esse m') || s.includes('atual')) {
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return {
      data_inicio: fmt(primeiroDia),
      data_fim: fmt(hoje),
      label: 'este mês'
    };
  }

  // Meses por nome (ex: "novembro", "dezembro")
  const meses = {
    'janeiro': 0, 'fevereiro': 1, 'março': 2, 'marco': 2, 'abril': 3,
    'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7,
    'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
  };

  for (const [nome, mes] of Object.entries(meses)) {
    if (s.includes(nome)) {
      // Detectar ano (padrão: ano atual)
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

  // "ano de YYYY" ou "em YYYY"
  const anoMatch = s.match(/\b(20\d{2})\b/);
  if (anoMatch) {
    const ano = parseInt(anoMatch[1]);
    return {
      data_inicio: `${ano}-01-01`,
      data_fim: `${ano}-12-31`,
      label: `ano de ${ano}`
    };
  }

  // Se não detectou padrão, assume dia único
  return null;
}

// ═════════════════════════════════════════════════════════════
// PROCESSAMENTO DO INPUT
// ═════════════════════════════════════════════════════════════

const input = $input?.item?.json || {};

let dataInicio, dataFim, periodoLabel;

// Tentar detectar período automático
const periodoDetectado = parsePeriodo(
  input.periodo || input.data || input.mes || input.quando || ''
);

if (periodoDetectado) {
  dataInicio = periodoDetectado.data_inicio;
  dataFim = periodoDetectado.data_fim;
  periodoLabel = periodoDetectado.label;
} else {
  // Modo manual: data_inicio e data_fim, ou data única
  if (input.data_inicio && input.data_fim) {
    dataInicio = normalizaData(input.data_inicio);
    dataFim = normalizaData(input.data_fim);
    periodoLabel = `${isoParaBR(dataInicio)} a ${isoParaBR(dataFim)}`;
  } else if (input.data) {
    dataInicio = normalizaData(input.data);
    dataFim = dataInicio;
    periodoLabel = isoParaBR(dataInicio);
  } else {
    // Padrão: hoje
    dataInicio = hojeSP();
    dataFim = dataInicio;
    periodoLabel = 'hoje';
  }
}

console.log(`[ESPELHO] Período: ${periodoLabel} (${dataInicio} a ${dataFim})`);

// ═════════════════════════════════════════════════════════════
// CONFIG E SETUP
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
// EXECUÇÃO PRINCIPAL
// ═════════════════════════════════════════════════════════════

try {
  // 1. LOGIN
  console.log('[ESPELHO] Fazendo login...');
  const loginResult = await graphqlRequest(
    `mutation { login(email: "${email}", password: "${password}", remember: false) { id name } }`,
    true
  );

  if (loginResult.json.errors) {
    throw new Error(`Erro no login: ${JSON.stringify(loginResult.json.errors)}`);
  }

  console.log('[ESPELHO] Login OK -', loginResult.json.data?.login?.name);

  // 2. BUSCAR ENTRADAS (TODAS AS PÁGINAS NECESSÁRIAS)
  console.log('[ESPELHO] Buscando entradas do espelho bancário...');

  let allEntries = [];
  let currentPage = 1;
  let totalPages = 1;
  const perPage = 100;
  let encontrouDadosPeriodo = false;

  // Loop para buscar TODAS as páginas necessárias
  while (currentPage <= totalPages) {
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
      throw new Error(`Erro na query: ${JSON.stringify(entriesQuery.errors)}`);
    }

    const data = entriesQuery?.data?.entriesBankMirror?.data || [];
    const paginator = entriesQuery?.data?.entriesBankMirror?.paginatorInfo;

    if (paginator) {
      totalPages = paginator.lastPage;
      console.log(`[ESPELHO] Página ${currentPage}/${totalPages} - ${data.length} registros`);
    }

    // Verificar se há dados do período nesta página
    const temDadosPeriodo = data.some(e => {
      const dataRegistro = String(e?.date || '').split(' ')[0];
      return dataRegistro >= dataInicio && dataRegistro <= dataFim;
    });

    if (temDadosPeriodo) {
      encontrouDadosPeriodo = true;
      allEntries = allEntries.concat(data);
    } else if (encontrouDadosPeriodo) {
      // Já passou do período, pode parar
      console.log(`[ESPELHO] Passou do período ${periodoLabel}. Parando busca.`);
      break;
    } else {
      // Ainda não chegou no período, continua
      allEntries = allEntries.concat(data);
    }

    currentPage++;

    // Limite de segurança: 50 páginas (5000 registros)
    if (currentPage > 50) {
      console.log('[ESPELHO] Limite de 50 páginas atingido. Parando busca.');
      break;
    }
  }

  console.log(`[ESPELHO] Total de registros carregados: ${allEntries.length}`);

  // 3. FILTRAR PELO PERÍODO
  const filtered = allEntries
    .filter((e) => {
      const dataRegistro = String(e?.date || '').split(' ')[0];
      return dataRegistro >= dataInicio && dataRegistro <= dataFim;
    })
    .map((e) => ({
      ...e,
      value: Number(e?.value || 0),
      via_id: String(e?.via_id ?? ''),
      via: viasMap[String(e?.via_id ?? '')] || `Via ${String(e?.via_id ?? '')}`,
    }));

  console.log(`[ESPELHO] Entradas encontradas para o período: ${filtered.length}`);

  if (filtered.length === 0) {
    return JSON.stringify({
      data_inicio: dataInicio,
      data_fim: dataFim,
      periodo_label: periodoLabel,
      mensagem: `Não houve recebimentos no período: ${periodoLabel}.`,
      total_recebido: 0,
      saldo_periodo: 0,
      detalhes: []
    });
  }

  const recebimentos = filtered.filter((e) => e.value > 0);
  const pagamentos = filtered.filter((e) => e.value < 0);

  // 4. AGRUPAR RECEBIMENTOS POR VIA
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
  const saldoPeriodo = totalRecebido + totalPago;

  console.log(`[ESPELHO] Total recebido: R$ ${totalRecebido}`);
  console.log(`[ESPELHO] Saldo do período: R$ ${saldoPeriodo}`);

  // 5. FORMATAR RESPOSTA
  let mensagem = `📊 Recebimentos de ${periodoLabel}:\n\n`;

  // Listar cada via com seu total
  for (const item of resumoRecebimentos) {
    mensagem += `${item.via} - R$ ${formatarDinheiro(item.total)}\n`;
  }

  mensagem += `\nTotal = R$ ${formatarDinheiro(totalRecebido)}`;

  // Se houve pagamentos, mencionar o saldo líquido
  if (totalPago < 0) {
    mensagem += `\n\n💸 Pagamentos: R$ ${formatarDinheiro(Math.abs(totalPago))}`;
    mensagem += `\n💰 Saldo líquido: R$ ${formatarDinheiro(saldoPeriodo)}`;
  }

  // 6. RETORNO
  return JSON.stringify({
    data_inicio: dataInicio,
    data_fim: dataFim,
    periodo_label: periodoLabel,
    mensagem: mensagem,
    total_recebido: totalRecebido,
    total_pago: Math.abs(totalPago),
    saldo_periodo: saldoPeriodo,
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
    periodo_label: periodoLabel || 'período solicitado',
    mensagem: `Erro ao buscar espelho bancário: ${err.message}`,
  });
}
