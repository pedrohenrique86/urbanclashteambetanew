# Docker Setup - Urban Clash Team

Este projeto usa Docker Compose para rodar Redis e PostgreSQL.

## Pré-requisitos

- Docker Desktop instalado e rodando
- Docker Compose (vem com Docker Desktop)

## Iniciar os Serviços

### 1. Copiar o arquivo de variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` se necessário (as configurações padrão já funcionam com Docker).

### 2. Iniciar Redis e PostgreSQL

```bash
docker-compose up -d
```

Isso vai iniciar:

- **Redis** na porta `6379`
- **PostgreSQL** na porta `5432`

### 3. Verificar se está rodando

```bash
docker-compose ps
```

Você deve ver:

```
NAME                    STATUS
urbanclash-redis        Up
urbanclash-postgres     Up
```

### 4. Testar conexões

**Redis:**

```bash
docker exec urbanclash-redis redis-cli ping
# Resposta: PONG
```

**PostgreSQL:**

```bash
docker exec urbanclash-postgres pg_isready -U postgres
# Resposta: /var/run/postgresql:5432 - accepting connections
```

## Comandos Úteis

### Parar os serviços

```bash
docker-compose down
```

### Parar e remover volumes (limpa dados!)

```bash
docker-compose down -v
```

### Ver logs

```bash
# Todos os serviços
docker-compose logs -f

# Apenas Redis
docker-compose logs -f redis

# Apenas PostgreSQL
docker-compose logs -f postgres
```

### Reiniciar um serviço

```bash
docker-compose restart redis
docker-compose restart postgres
```

### Acessar o container

```bash
# Redis CLI
docker exec -it urbanclash-redis redis-cli

# PostgreSQL
docker exec -it urbanclash-postgres psql -U postgres -d urbanclash
```

## Configuração do Backend

Certifique-se de que o `.env` na pasta `backend` tem:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/urbanclash
REDIS_URL=redis://localhost:6379
```

## Iniciar o Backend

```bash
cd backend
npm install
npm start
```

## Iniciar o Frontend

```bash
npm install
npm run dev
```

## Troubleshooting

### Porta já em uso

Se der erro de porta ocupada, pare outros containers ou serviços usando as portas 5432 ou 6379.

### Dados persistem?

Sim! Os dados são salvos em volumes Docker. Para limpar tudo:

```bash
docker-compose down -v
```

### Redis não conecta

Verifique se o container está rodando:

```bash
docker ps
```

E teste a conexão:

```bash
docker exec urbanclash-redis redis-cli ping
```

### PostgreSQL não conecta

Verifique os logs:

```bash
docker-compose logs postgres
```

## Estrutura

```
.
├── docker-compose.yml      # Configuração dos containers
├── .env.example            # Template de variáveis
├── backend/
│   ├── .env               # Variáveis do backend
│   └── ...
└── src/                    # Frontend
    └── ...
```

## Suporte

Se tiver problemas, verifique:

1. Docker Desktop está rodando
2. Portas 5432 e 6379 estão livres
3. Arquivo `.env` está configurado corretamente
