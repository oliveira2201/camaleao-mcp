# ⚡ Guia Rápido - Deploy Gateway no Easypanel

## 🎯 Passos Simples

### 1. Preparar arquivos para upload

Você precisa enviar estas pastas para um repositório Git:

```
camaleao-mcp/
├── mcp-gateway/
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
└── mcp-camaleao-crm/
    ├── src/
    ├── package.json
    └── tsconfig.json
```

### 2. Opção A: GitHub (Recomendado)

**No seu terminal:**
```bash
cd C:\Users\Wjcam\OneDrive\Documentos\GESTORCONECTA\n8n

# Inicializar Git (se ainda não fez)
git init

# Adicionar arquivos
git add mcp-gateway/ mcp-camaleao-crm/ MCP-SERVERS-README.md

# Commit
git commit -m "feat: MCP Gateway + CRM Server"

# Criar repo no GitHub:
# 1. Vá em https://github.com/new
# 2. Nome: camaleao-mcp
# 3. Private
# 4. Create

# Adicionar remote e push
git remote add origin https://github.com/SEU-USUARIO/camaleao-mcp.git
git branch -M main
git push -u origin main
```

### 3. No Easypanel

1. **Login** no Easypanel
2. **+ Create** → **App**
3. **Name:** `mcp-gateway`
4. **Source:**
   - Type: **GitHub**
   - Repository: `seu-usuario/camaleao-mcp`
   - Branch: `main`
   - Auto Deploy: ✅ (sim)

5. **Build:**
   - Dockerfile Path: `mcp-gateway/Dockerfile`
   - Context: `.` (raiz)

6. **Environment Variables:**
   ```
   PORT=3100
   NODE_ENV=production
   CAMALEAO_API_URL=https://web-api.camaleaocamisas.com.br/graphql-api
   CAMALEAO_EMAIL=api-gerente@email.com
   CAMALEAO_PASSWORD=PPTDYBYqcmE7wg
   ```

7. **Port Mapping:**
   - Container Port: `3100`
   - Public Port: (automático)

8. **Domain:**
   - Add Domain: `mcp.gestorconecta.com.br`
   - Enable HTTPS: ✅

9. **Deploy** 🚀

---

### 4. Verificar Deploy

Após alguns minutos:

✅ **Dashboard:** https://mcp.gestorconecta.com.br
✅ **Health:** https://mcp.gestorconecta.com.br/health
✅ **API Docs:** https://mcp.gestorconecta.com.br/mcp/list

---

### 5. Testar no n8n

**Criar workflow de teste:**

1. **HTTP Request Node**
   - Method: `POST`
   - URL: `https://mcp.gestorconecta.com.br/mcp/crm/espelho_bancario`
   - Body:
   ```json
   {
     "periodo": "hoje"
   }
   ```

2. **Execute**
3. Ver resultado 🎉

---

## 🐛 Troubleshooting

### Build failed

**Veja logs no Easypanel:**
- Clique no app
- **Logs** tab
- Veja erros

**Comum:**
- Dockerfile errado → verificar path
- Dependências faltando → verificar package.json

### App deployed mas não funciona

**Verifique:**
1. **Logs** no Easypanel
2. **Port** está 3100?
3. **Environment vars** configuradas?
4. **Domain** aponta para a VPS?

### n8n não consegue acessar

**Verifique:**
1. URL está correta?
2. HTTPS ativo?
3. Firewall permite conexão?
4. Teste no navegador primeiro

---

## ⚡ Opção B: Deploy Manual (sem Git)

Se não quiser usar Git:

1. **Compactar** as pastas em `camaleao-mcp.zip`
2. No Easypanel: **+ Create** → **App**
3. **Source:** Upload ZIP
4. Configurar igual acima
5. Deploy

---

## 🎊 Pronto!

Após deploy:
- ✅ Gateway funcionando na VPS
- ✅ Acessível pelo n8n
- ✅ Dashboard visual disponível
- ➡️ Implementar próximas tools

---

**Precisa de ajuda?** Cole os logs de erro aqui!
