export declare class GraphQLClient {
    private apiUrl;
    private email;
    private password;
    private cookies;
    constructor(apiUrl: string, email: string, password: string);
    request<T>(query: string, fullResponse?: boolean): Promise<T>;
    login(): Promise<void>;
    ensureAuthenticated(): Promise<void>;
}
//# sourceMappingURL=graphql-client.d.ts.map