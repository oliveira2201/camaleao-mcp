// ═══════════════════════════════════════════════════════════════
// CLIENTE GRAPHQL REUTILIZÁVEL
// ═══════════════════════════════════════════════════════════════
import fetch from 'node-fetch';
export class GraphQLClient {
    apiUrl;
    email;
    password;
    cookies = '';
    constructor(apiUrl, email, password) {
        this.apiUrl = apiUrl;
        this.email = email;
        this.password = password;
    }
    async request(query, fullResponse = false) {
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
        const body = await response.json();
        if (body.errors) {
            throw new Error(`GraphQL Error: ${JSON.stringify(body.errors)}`);
        }
        return body.data;
    }
    async login() {
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
    async ensureAuthenticated() {
        if (!this.cookies) {
            await this.login();
        }
    }
}
//# sourceMappingURL=graphql-client.js.map