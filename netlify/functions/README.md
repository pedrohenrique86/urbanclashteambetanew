# Funções Serverless do Netlify

## Visão Geral

Este diretório continha funções serverless que eram executadas no Netlify. Essas funções foram migradas para o backend local e não são mais necessárias.

## Migração para Backend Local

As funções serverless anteriormente disponíveis neste diretório foram migradas para rotas no backend local. Agora, todas as operações são realizadas diretamente pelo servidor Express, eliminando a necessidade de funções serverless no Netlify.

### Rotas Migradas

- `/api/check-email` → Agora disponível como `/api/auth/check-email` no backend local

## Configuração

### Desenvolvimento Local

Para testar as rotas localmente, inicie o servidor backend:

```bash
cd backend
npm start
```

O servidor estará disponível em `http://localhost:3001`.

## Segurança

As rotas do backend são projetadas para expor apenas as operações específicas necessárias, com validação adequada de entrada para evitar uso indevido.