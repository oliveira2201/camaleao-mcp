// ═══════════════════════════════════════════════════════════════
// CLIENTE GRAPHQL REUTILIZÁVEL
// ═══════════════════════════════════════════════════════════════

import fetch from 'node-fetch';
import type { GraphQLResponse } from '../types/index.js';

export class GraphQLClient {
  private cookies: string = '';

  constructor(
    private apiUrl: string,
    private email: string,
    private password: string
  ) {}

  async request<T>(query: string, fullResponse = false): Promise<T> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.cookies ? { Cookie: this.cookies } : {}),
      },
      body: JSON.stringify({ query }),
    });

    // Capturar cookies
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      this.cookies = setCookie.split(';')[0];
    }

    const body = await response.json() as GraphQLResponse<T>;

    if (body.errors) {
      throw new Error(`GraphQL Error: ${JSON.stringify(body.errors)}`);
    }

    return body.data as T;
  }

  async login(): Promise<void> {
    const query = `
      mutation {
        login(
          email: "${this.email}",
          password: "${this.password}",
          remember: false
        ) {
          id
          name
        }
      }
    `;

    await this.request(query);
  }

  async ensureAuthenticated(): Promise<void> {
    if (!this.cookies) {
      await this.login();
    }
  }
}
