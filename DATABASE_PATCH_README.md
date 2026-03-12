# Patch do Banco de Dados - Urban Clash Team

## 📋 Resumo das Alterações

Este patch foi aplicado com sucesso no banco de dados PostgreSQL do projeto Urban Clash Team, implementando as seguintes modificações:

### 🔄 Tabela `users`
- ✅ **Adicionada coluna `birth_date`**: Campo do tipo `DATE` para armazenar a data de nascimento do usuário
- ✅ **Adicionada coluna `country`**: Campo do tipo `VARCHAR(3)` para código do país de residência (padrão ISO 3166-1 alpha-2)

### 🔄 Tabela `user_profiles`
- ✅ **Substituída coluna `display_name` por `username`**: 
  - Migração automática dos dados existentes
  - Campo `username` agora é obrigatório (NOT NULL)
  - Criado índice único para garantir unicidade

## 🗂️ Arquivos Criados

1. **`database_patch_user_updates.sql`** - Script SQL com todas as alterações
2. **`apply_database_patch.js`** - Script Node.js para aplicar o patch automaticamente
3. **`DATABASE_PATCH_README.md`** - Esta documentação

## 🔍 Índices Criados

Para otimização de performance, foram criados os seguintes índices:

- `idx_users_country` - Índice na coluna `country` da tabela `users`
- `idx_users_birth_date` - Índice na coluna `birth_date` da tabela `users`
- `user_profiles_username_unique` - Índice único na coluna `username` da tabela `user_profiles`

## 📊 Estrutura Final das Tabelas

### Tabela `users`
```sql
- id: uuid (NOT NULL)
- auth_id: uuid (NULL)
- username: character varying (NOT NULL)
- clan_id: uuid (NULL)
- faction: character varying (NULL)
- level: integer (NULL)
- experience: integer (NULL)
- resources: jsonb (NULL)
- created_at: timestamp with time zone (NULL)
- updated_at: timestamp with time zone (NULL)
- birth_date: date (NULL)              -- ✨ NOVO
- country: character varying (NULL)     -- ✨ NOVO
```

### Tabela `user_profiles`
```sql
- id: uuid (NOT NULL)
- user_id: uuid (NULL)
- faction: character varying (NULL)
- level: integer (NULL)
- xp: integer (NULL)
- energy: integer (NULL)
- action_points: integer (NULL)
- attack: integer (NULL)
- defense: integer (NULL)
- focus: integer (NULL)
- intimidation: numeric (NULL)
- discipline: numeric (NULL)
- critical_damage: numeric (NULL)
- critical_chance: numeric (NULL)
- action_points_reset_time: timestamp without time zone (NULL)
- money: integer (NULL)
- victories: integer (NULL)
- defeats: integer (NULL)
- winning_streak: integer (NULL)
- money_daily_gain: integer (NULL)
- username: character varying (NOT NULL)  -- ✨ SUBSTITUIU display_name
```

## 🚀 Como Usar

### Aplicar o Patch Manualmente
```bash
# Conectar ao PostgreSQL e executar o arquivo SQL
psql -U postgres -d urbanclash -f database_patch_user_updates.sql
```

### Aplicar o Patch via Script Node.js
```bash
# Executar o script automatizado
node apply_database_patch.js
```

## ⚠️ Considerações Importantes

1. **Backup**: Sempre faça backup do banco antes de aplicar patches
2. **Migração de Dados**: O script migra automaticamente dados de `display_name` para `username`
3. **Compatibilidade**: Verifique se o código da aplicação está atualizado para usar `username` ao invés de `display_name`
4. **Validação**: Os novos campos `birth_date` e `country` são opcionais (NULL permitido)

## 🔧 Próximos Passos

1. **Atualizar código backend**: Modificar rotas e validações para incluir os novos campos
2. **Atualizar frontend**: Adicionar campos de data de nascimento e país nos formulários
3. **Testes**: Executar testes para garantir compatibilidade
4. **Documentação da API**: Atualizar documentação para refletir as mudanças

## 📅 Data de Aplicação

**Patch aplicado com sucesso em:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

---

✅ **Status**: Patch aplicado com sucesso  
🔗 **Banco**: PostgreSQL - urbanclash  
👤 **Aplicado por**: Sistema automatizado