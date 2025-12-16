// ═══════════════════════════════════════════════════════════════
// FORMATADORES DE DADOS
// ═══════════════════════════════════════════════════════════════

export function formatarDinheiro(valor: number): string {
  return valor.toFixed(2).replace('.', ',');
}

export function formatarData(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export const VIAS_MAP: Record<string, string> = {
  '1': 'Caixa',
  '2': 'Banco do Brasil',
  '3': 'Nubank',
  '4': 'Dinheiro',
  '5': 'Cartão de crédito',
  '6': 'Cora',
  '7': 'Banco Inter',
  '8': 'Mercado Pago',
};

export function obterNomeVia(viaId: string): string {
  return VIAS_MAP[viaId] || `Via ${viaId}`;
}
