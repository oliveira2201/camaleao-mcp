// Simular dia 16/12/2025 (terça-feira)
const hoje = new Date(2025, 11, 16); // mês 11 = dezembro (0-indexed)

console.log('Hoje:', hoje.toLocaleDateString('pt-BR'));
console.log('Dia da semana:', hoje.getDay(), '(0=dom, 1=seg, 2=ter, ...)');
console.log('');

const diaSemana = hoje.getDay(); // 2 (terça)
const diasDesdeSegunda = diaSemana === 0 ? 6 : diaSemana - 1; // 2 - 1 = 1

console.log('Dias desde segunda:', diasDesdeSegunda);
console.log('');

// Segunda-feira desta semana
const segundaFeira = new Date(hoje);
segundaFeira.setDate(hoje.getDate() - diasDesdeSegunda);
console.log('Segunda desta semana:', segundaFeira.toLocaleDateString('pt-BR'));

// Segunda da semana passada
const segundaPassada = new Date(hoje);
segundaPassada.setDate(hoje.getDate() - (diasDesdeSegunda + 7));
console.log('Segunda da semana passada:', segundaPassada.toLocaleDateString('pt-BR'));

// Domingo da semana passada
const domingoPassado = new Date(hoje);
domingoPassado.setDate(hoje.getDate() - (diasDesdeSegunda + 1));
console.log('Domingo da semana passada:', domingoPassado.toLocaleDateString('pt-BR'));

console.log('');
console.log('Esta semana deveria ser: 15/12 (seg) a 16/12 (ter)');
console.log('Semana passada deveria ser: 08/12 (seg) a 14/12 (dom)');
