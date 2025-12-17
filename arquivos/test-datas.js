// 🧪 TESTE DE CONVERSÃO DE DATAS
// Execute com: node test-datas.js

function testarConversaoDatas(periodoRaw) {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 Testando período:', periodoRaw);
  console.log('='.repeat(60));

  // Pega a data atual no horário de Brasília
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

  console.log('📅 Hoje (Brasília):', `${diaStr}/${mesStr}/${anoStr}`);

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

  let dataInicial = new Date(hoje);
  let dataFinal = new Date(hoje);
  let periodoLabel = 'hoje';

  // Lógica de períodos
  const periodo = periodoRaw.toLowerCase().trim();

  if (periodo.includes('ontem') || periodo.includes('yesterday')) {
    dataInicial = subtrairDias(hoje, 1);
    dataFinal = subtrairDias(hoje, 1);
    periodoLabel = 'ontem';
  }
  else if (periodo.includes('7') || periodo.includes('semana')) {
    dataInicial = subtrairDias(hoje, 6);
    dataFinal = hoje;
    periodoLabel = 'últimos 7 dias';
  }
  else if (periodo.includes('30')) {
    dataInicial = subtrairDias(hoje, 29);
    dataFinal = hoje;
    periodoLabel = 'últimos 30 dias';
  }
  else if (periodo.includes('passado') && (periodo.includes('mes') || periodo.includes('mês'))) {
    dataInicial = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    dataFinal = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    periodoLabel = 'mês passado';
  }
  else if ((periodo.includes('atual') || periodo.includes('este') || periodo.includes('esse')) && (periodo.includes('mes') || periodo.includes('mês'))) {
    dataInicial = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    dataFinal = hoje;
    periodoLabel = 'este mês';
  }
  else {
    dataInicial = hoje;
    dataFinal = hoje;
    periodoLabel = 'hoje';
  }

  const dataInicialStr = formatar(dataInicial);
  const dataFinalStr = formatar(dataFinal);

  console.log('\n✅ RESULTADO:');
  console.log('   Label:', periodoLabel);
  console.log('   Data Inicial:', dataInicialStr, `(${dataInicial.getDate()}/${dataInicial.getMonth() + 1}/${dataInicial.getFullYear()})`);
  console.log('   Data Final:', dataFinalStr, `(${dataFinal.getDate()}/${dataFinal.getMonth() + 1}/${dataFinal.getFullYear()})`);

  return {
    periodo_original: periodoRaw,
    periodo_label: periodoLabel,
    data_inicial: dataInicialStr,
    data_final: dataFinalStr
  };
}

// Testes
console.log('\n🧪 INICIANDO TESTES DE CONVERSÃO DE DATAS\n');

const testes = [
  'hoje',
  'ontem',
  '7 dias',
  'semana passada',
  '30 dias',
  'mês passado',
  'este mês',
  'mês atual'
];

const resultados = testes.map(teste => testarConversaoDatas(teste));

console.log('\n' + '='.repeat(60));
console.log('📊 RESUMO DOS TESTES');
console.log('='.repeat(60));
console.table(resultados);
