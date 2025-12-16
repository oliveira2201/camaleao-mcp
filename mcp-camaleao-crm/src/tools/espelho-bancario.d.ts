import type { GraphQLClient } from '../lib/graphql-client.js';
import type { EspelhoBancarioResult } from '../types/index.js';
export declare function espelhoBancario(client: GraphQLClient, args: {
    data?: string;
    data_inicio?: string;
    data_fim?: string;
    periodo?: string;
}): Promise<EspelhoBancarioResult>;
//# sourceMappingURL=espelho-bancario.d.ts.map