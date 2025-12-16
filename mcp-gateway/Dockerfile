# Dockerfile otimizado para Easypanel
FROM node:20-alpine

# Instalar dependências do sistema
RUN apk add --no-cache git python3 make g++

# Criar diretórios
WORKDIR /app

# Copiar package.json do gateway
COPY mcp-gateway/package*.json ./

# Instalar dependências
RUN npm install

# Copiar código do gateway
COPY mcp-gateway/ ./

# Copiar MCP CRM (dependência)
COPY mcp-camaleao-crm/ /mcp-camaleao-crm/

# Build MCP CRM
WORKDIR /mcp-camaleao-crm
RUN npm install && npm run build

# Voltar ao gateway
WORKDIR /app

# Build gateway (se usar TypeScript)
# RUN npm run build

# Expor porta
EXPOSE 3100

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3100

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3100/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Iniciar (modo dev com tsx por enquanto, depois mudar para build)
CMD ["npm", "run", "dev"]
