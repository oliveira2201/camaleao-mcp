import { parsePeriodo } from './mcp-camaleao-crm/build/lib/date-parser.js';

console.log('═══════════════════════════════════════════════════════');
console.log('🧪 TESTE DO PARSER DE PERÍODOS');
console.log('═══════════════════════════════════════════════════════\n');

console.log('1. Testando "hoje":');
console.log(parsePeriodo('hoje'));

console.log('\n2. Testando "ontem":');
console.log(parsePeriodo('ontem'));

console.log('\n3. Testando "esta semana":');
console.log(parsePeriodo('esta semana'));

console.log('\n4. Testando "novembro":');
console.log(parsePeriodo('novembro'));

console.log('\n═══════════════════════════════════════════════════════');
