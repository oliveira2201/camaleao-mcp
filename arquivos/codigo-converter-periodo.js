// 🔧 CONVERTER PERÍODO PARA DATAS
// ═════════════════════════════════════════════════════

const items = $input.all();

return items.map(function(item) {
  const periodoRaw = (item.json.periodo || '').toString().toLowerCase().trim();

  console.log('🔍 DEBUG - Período recebido:', periodoRaw);

  // ═══════════════════════════════════════════════════
  // 1. OBTER DATA ATUAL NO FUSO HORÁRIO DO BRASIL
  // ═══════════════════════════════════════════════════

  // Pega a data/hora atual no horário de Brasília
  const agora = new Date();
  const brasiliaStr = agora.toLocaleString('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  // Parse: formato "MM/DD/YYYY"
  const [mesStr, diaStr, anoStr] = brasiliaStr.split('/');
  const hoje = new Date(parseInt(anoStr), parseInt(mesStr) - 1, parseInt(diaStr));

  console.log('📅 DEBUG - Hoje (Brasília):', `${diaStr}/${mesStr}/${anoStr}`);

  // ═══════════════════════════════════════════════════
  // 2. HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════

  // Formatar para YYYY-MM-DD (padrão Facebook)
  const formatar = (d) => {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  // Subtrair dias
  const subtrairDias = (data, dias) => {
    const d = new Date(data);
    d.setDate(d.getDate() - dias);
    return d;
  };

  // ═══════════════════════════════════════════════════
  // 3. VARIÁVEIS DE DATA
  // ═══════════════════════════════════════════════════

  let dataInicial = new Date(hoje);
  let dataFinal = new Date(hoje);
  let periodoLabel = 'hoje';

  // ═══════════════════════════════════════════════════
  // 4. LÓGICA DE PERÍODOS
  // ═══════════════════════════════════════════════════

  // 1. ONTEM
  if (periodoRaw.includes('ontem') || periodoRaw.includes('yesterday')) {
    dataInicial = subtrairDias(hoje, 1);
    dataFinal = subtrairDias(hoje, 1);
    periodoLabel = 'ontem';
    console.log('✅ Período: ONTEM');
  }

  // 2. ÚLTIMOS 7 DIAS
  else if (periodoRaw.includes('7') || periodoRaw.includes('semana')) {
    dataInicial = subtrairDias(hoje, 6);
    dataFinal = hoje;
    periodoLabel = 'últimos 7 dias';
    console.log('✅ Período: ÚLTIMOS 7 DIAS');
  }

  // 3. ÚLTIMOS 30 DIAS
  else if (periodoRaw.includes('30')) {
    dataInicial = subtrairDias(hoje, 29);
    dataFinal = hoje;
    periodoLabel = 'últimos 30 dias';
    console.log('✅ Período: ÚLTIMOS 30 DIAS');
  }

  // 4. MÊS PASSADO
  else if (periodoRaw.includes('passado') && (periodoRaw.includes('mes') || periodoRaw.includes('mês'))) {
    dataInicial = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    dataFinal = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    periodoLabel = 'mês passado';
    console.log('✅ Período: MÊS PASSADO');
  }

  // 5. ESTE MÊS / MÊS ATUAL
  else if ((periodoRaw.includes('atual') || periodoRaw.includes('este') || periodoRaw.includes('esse')) && (periodoRaw.includes('mes') || periodoRaw.includes('mês'))) {
    dataInicial = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    dataFinal = hoje;
    periodoLabel = 'este mês';
    console.log('✅ Período: ESTE MÊS');
  }

  // 6. PADRÃO: HOJE
  else {
    dataInicial = hoje;
    dataFinal = hoje;
    periodoLabel = 'hoje';
    console.log('✅ Período: HOJE (padrão)');
  }

  // ═══════════════════════════════════════════════════
  // 5. OUTPUT FORMATADO
  // ═══════════════════════════════════════════════════

  const dataInicialStr = formatar(dataInicial);
  const dataFinalStr = formatar(dataFinal);

  console.log('📤 DEBUG - Output:');
  console.log('   - Data Inicial:', dataInicialStr, `(${dataInicial.getDate()}/${dataInicial.getMonth() + 1}/${dataInicial.getFullYear()})`);
  console.log('   - Data Final:', dataFinalStr, `(${dataFinal.getDate()}/${dataFinal.getMonth() + 1}/${dataFinal.getFullYear()})`);
  console.log('   - Label:', periodoLabel);

  return {
    json: {
      periodo_original: periodoRaw,
      periodo_label: periodoLabel,
      data_inicial: dataInicialStr,
      data_final: dataFinalStr,

      // Debug extra
      _debug: {
        hoje_brasilia: formatar(hoje),
        data_inicial_legivel: `${dataInicial.getDate()}/${dataInicial.getMonth() + 1}/${dataInicial.getFullYear()}`,
        data_final_legivel: `${dataFinal.getDate()}/${dataFinal.getMonth() + 1}/${dataFinal.getFullYear()}`
      }
    }
  };
});
