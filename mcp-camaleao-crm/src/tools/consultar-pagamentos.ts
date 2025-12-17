// ═══════════════════════════════════════════════════════════════
// TOOL: CONSULTAR PAGAMENTOS
// ═══════════════════════════════════════════════════════════════

import type { GraphQLClient } from '../lib/graphql-client.js';

interface PaymentsPendenciesResponse {
  paymentsPendencies: {
    total_paid: number;
    total_unpaid: number;
  };
}

export async function consultarPagamentos(
  client: GraphQLClient
): Promise<{
  total_pago: number;
  total_a_receber: number;
  mensagem: string;
}> {
  await client.ensureAuthenticated();

  console.log('[PAGAMENTOS] Consultando pendências...');

  const query = `
    query {
      paymentsPendencies {
        total_paid
        total_unpaid
      }
    }
  `;

  const response = await client.request<PaymentsPendenciesResponse>(query);
  const data = response.paymentsPendencies;

  console.log(`[PAGAMENTOS] Pago: R$ ${data.total_paid} | A receber: R$ ${data.total_unpaid}`);

  const mensagem = `💰 Pendências de Pagamento\n\n` +
    `Total já pago: R$ ${data.total_paid.toFixed(2).replace('.', ',')}\n` +
    `Total a receber: R$ ${data.total_unpaid.toFixed(2).replace('.', ',')}`;

  return {
    total_pago: data.total_paid,
    total_a_receber: data.total_unpaid,
    mensagem,
  };
}
