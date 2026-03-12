# Supabase Migrations

Este diretório contém as migrações do banco de dados para o projeto Urban Clash.

## Tabela de Clãs

A tabela `clans` foi criada para armazenar informações sobre os clãs no jogo. Cada clã tem um nome, uma facção (gangsters ou guardas) e uma pontuação.

### Estrutura da Tabela

```sql
create table if not exists public.clans (
  id uuid not null primary key default uuid_generate_v4(),
  name text not null,
  faction text not null check (faction in ('gangsters', 'guardas')),
  score integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
```

### Como Executar a Migração

Para executar a migração, você pode usar o CLI do Supabase:

```bash
supabase db push
```

Ou você pode executar o SQL diretamente no editor SQL do Supabase.

### Como Usar a Tabela

Para inserir um novo clã:

```typescript
const { data, error } = await supabase
  .from('clans')
  .insert([
    { 
      name: 'Nome do Clã', 
      faction: 'gangsters', // ou 'guardas'
      score: 0 
    }
  ]);
```

Para buscar os clãs ordenados por pontuação:

```typescript
const { data, error } = await supabase
  .from('clans')
  .select('id, name, faction, score')
  .order('score', { ascending: false })
  .limit(10);
```

Para atualizar a pontuação de um clã:

```typescript
const { data, error } = await supabase
  .from('clans')
  .update({ score: 1000 })
  .eq('id', 'id-do-cla');
```