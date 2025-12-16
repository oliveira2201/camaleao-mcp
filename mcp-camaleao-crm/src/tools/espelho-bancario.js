// ═══════════════════════════════════════════════════════════════
// TOOL: ESPELHO BANCÁRIO
// ═══════════════════════════════════════════════════════════════
import { parsePeriodo, normalizaData, hojeSP, isoParaBR } from '../lib/date-parser.js';
import { formatarDinheiro, obterNomeVia } from '../lib/formatters.js';
const TIMEOUT_MS = 45000;
const MAX_PAGINAS = 20;
export async function espelhoBancario(client, args) {
    await client.ensureAuthenticated();
    // Determinar período
    let dataInicio;
    let dataFim;
    let periodoLabel;
    const periodoDetectado = parsePeriodo(args.periodo || args.data || '');
    if (periodoDetectado) {
        dataInicio = periodoDetectado.data_inicio;
        dataFim = periodoDetectado.data_fim;
        periodoLabel = periodoDetectado.label;
    }
    else if (args.data_inicio && args.data_fim) {
        dataInicio = normalizaData(args.data_inicio);
        dataFim = normalizaData(args.data_fim);
        periodoLabel = `${isoParaBR(dataInicio)} a ${isoParaBR(dataFim)}`;
    }
    else if (args.data) {
        dataInicio = normalizaData(args.data);
        dataFim = dataInicio;
        periodoLabel = isoParaBR(dataInicio);
    }
    else {
        dataInicio = hojeSP();
        dataFim = dataInicio;
        periodoLabel = 'hoje';
    }
    console.log(`[ESPELHO] Período: ${periodoLabel} (${dataInicio} a ${dataFim})`);
    // Executar com timeout
    const resultado = await Promise.race([
        executarConsulta(client, dataInicio, dataFim, periodoLabel),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: consulta demorou mais de 45s')), TIMEOUT_MS)),
    ]);
    return resultado;
}
async function executarConsulta(client, dataInicio, dataFim, periodoLabel) {
    let allEntries = [];
    let currentPage = 1;
    let totalPages = 1;
    const perPage = 100;
    console.log('[ESPELHO] Buscando dados...');
    while (currentPage <= totalPages && currentPage <= MAX_PAGINAS) {
        const query = `
      query {
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
      }
    `;
        const result = await client.request(query);
        const data = result.entriesBankMirror.data;
        const paginator = result.entriesBankMirror.paginatorInfo;
        totalPages = paginator.lastPage;
        console.log(`[ESPELHO] Pág ${currentPage}/${totalPages} - ${data.length} reg`);
        allEntries = allEntries.concat(data);
        if (data.length === 0)
            break;
        currentPage++;
    }
    console.log(`[ESPELHO] Total carregado: ${allEntries.length}`);
    // Filtrar pelo período
    const filtered = allEntries
        .filter((e) => {
        const dataReg = e.date.split(' ')[0];
        return dataReg >= dataInicio && dataReg <= dataFim;
    })
        .map((e) => ({
        ...e,
        value: Number(e.value),
        via: obterNomeVia(e.via_id),
    }));
    console.log(`[ESPELHO] Filtrados: ${filtered.length}`);
    if (filtered.length === 0) {
        return {
            data_inicio: dataInicio,
            data_fim: dataFim,
            periodo_label: periodoLabel,
            mensagem: `Não houve recebimentos em ${periodoLabel}.`,
            total_recebido: 0,
            total_pago: 0,
            saldo_periodo: 0,
            recebimentos_por_via: [],
        };
    }
    const recebimentos = filtered.filter((e) => e.value > 0);
    const pagamentos = filtered.filter((e) => e.value < 0);
    // Agrupar por via
    const porVia = {};
    for (const e of recebimentos) {
        if (!porVia[e.via])
            porVia[e.via] = [];
        porVia[e.via].push(e.value);
    }
    const resumo = Object.entries(porVia)
        .map(([via, valores]) => ({
        via,
        total: valores.reduce((s, v) => s + v, 0),
        quantidade: valores.length,
    }))
        .sort((a, b) => b.total - a.total);
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
        data_inicio: dataInicio,
        data_fim: dataFim,
        periodo_label: periodoLabel,
        mensagem: msg,
        total_recebido: totalRecebido,
        total_pago: Math.abs(totalPago),
        saldo_periodo: saldo,
        recebimentos_por_via: resumo,
    };
}
//# sourceMappingURL=espelho-bancario.js.map