// Debug: Testar parser de períodos
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

  // "esta semana"
  if (s.includes('esta semana') || s.includes('essa semana') || s.includes('nessa semana')) {
    const diaSemana = hoje.getDay();
    const diasAteSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
    const segunda = subDias(hoje, diasAteSegunda);
    return {
      data_inicio: fmt(segunda),
      data_fim: fmt(hoje),
      label: 'esta semana'
    };
  }

  return null;
}

console.log('═══════════════════════════════════════════');
console.log('DEBUG: Parser de Períodos');
console.log('═══════════════════════════════════════════');
console.log('');

const hoje = getDataAtualSP();
console.log(`📅 Hoje (São Paulo): ${hoje.toISOString().split('T')[0]}`);
console.log(`📅 Dia da semana: ${hoje.getDay()} (0=domingo, 1=segunda, ..., 6=sábado)`);
console.log('');

const testeCases = [
  'essa semana',
  'esta semana',
  'semana passada',
];

for (const teste of testeCases) {
  console.log(`🔍 Testando: "${teste}"`);
  const resultado = parsePeriodo(teste);
  if (resultado) {
    console.log(`   ✅ data_inicio: ${resultado.data_inicio}`);
    console.log(`   ✅ data_fim: ${resultado.data_fim}`);
    console.log(`   ✅ label: ${resultado.label}`);
  } else {
    console.log(`   ❌ Não reconheceu o período`);
  }
  console.log('');
}
