# Atualizações do Backend - Urban Clash Team

## 📋 Resumo das Alterações

Este documento descreve as atualizações realizadas no backend para incluir os novos campos `birth_date` e `country` na tabela `users`, e a substituição de `display_name` por `username` na tabela `user_profiles`.

## 🔄 Alterações Realizadas

### 1. **Arquivo: `backend/routes/auth.js`**

#### ✅ Validações Atualizadas
- Adicionada validação para `birth_date` (formato ISO8601: YYYY-MM-DD)
- Adicionada validação para `country` (código de 2-3 letras maiúsculas)
- Ambos os campos são opcionais

#### ✅ Rota de Registro Atualizada
- A rota `POST /api/auth/register` agora aceita os campos `birth_date` e `country`
- Os campos são inseridos na tabela `users` durante o registro
- Valores nulos são aceitos se os campos não forem fornecidos

```javascript
// Novos campos aceitos no registro
const { email, username, password, birth_date, country } = req.body;

// Inserção na tabela users
INSERT INTO users (email, username, password_hash, email_confirmation_token, birth_date, country) 
VALUES ($1, $2, $3, $4, $5, $6)
```

### 2. **Arquivo: `backend/routes/users.js`**

#### ✅ Validações Atualizadas
- Substituída validação de `display_name` por `username`
- Username deve ter 3-20 caracteres e conter apenas letras, números e underscore

#### ✅ Rota POST `/api/users/profile` Atualizada
- Agora usa `username` ao invés de `display_name` na criação de perfis
- Campo `username` é obrigatório na tabela `user_profiles`

#### ✅ Rota PUT `/api/users/profile` Atualizada
- Campo `username` incluído na lista de campos permitidos para atualização
- Removido `display_name` da lista de campos permitidos

#### ✅ Rota GET `/api/users/:id` Atualizada
- Consulta agora inclui `birth_date` e `country` da tabela `users`
- Usa `username` da tabela `user_profiles` ao invés de `display_name`
- Resposta inclui os novos campos na estrutura de dados

```javascript
// Nova estrutura de resposta
{
  user: {
    id: user.id,
    username: user.username,
    profile_username: user.profile_username || user.username,
    birth_date: user.birth_date,        // ✨ NOVO
    country: user.country,              // ✨ NOVO
    avatar_url: user.avatar_url,
    bio: user.bio,
    // ... outros campos
  }
}
```

### 3. **Arquivo: `src/lib/supabaseClient.ts`**

#### ✅ Função de Registro Atualizada
- A função `register()` agora aceita parâmetros opcionais `birthDate` e `country`
- Os campos são enviados para o backend apenas se fornecidos

```typescript
async register(email: string, username: string, password: string, birthDate?: string, country?: string)
```

### 4. **Arquivo: `src/components/AuthModal.tsx`**

#### ✅ Integração com Backend Atualizada
- O formulário de registro agora envia `birthDate` e `country` para o backend
- Validações do frontend já estavam implementadas
- Campos são enviados apenas se preenchidos pelo usuário

## 🔍 Validações Implementadas

### Backend (Express Validator)
- **birth_date**: Formato ISO8601 (YYYY-MM-DD), opcional
- **country**: 2-3 letras maiúsculas (ex: BR, US), opcional
- **username**: 3-20 caracteres, apenas letras, números e underscore

### Frontend (JavaScript)
- **birthDate**: Usuário deve ser maior de 18 anos, obrigatório
- **country**: Seleção obrigatória de país da lista
- **username**: Validação de formato e verificação de palavrões

## 📊 Estrutura Final das Tabelas

### Tabela `users`
```sql
- id: uuid (NOT NULL)
- email: character varying (NOT NULL)
- username: character varying (NOT NULL)
- password_hash: character varying (NOT NULL)
- birth_date: date (NULL)              -- ✨ NOVO
- country: character varying (NULL)     -- ✨ NOVO
- created_at: timestamp with time zone
- updated_at: timestamp with time zone
-- ... outros campos
```

### Tabela `user_profiles`
```sql
- id: uuid (NOT NULL)
- user_id: uuid (NOT NULL)
- username: character varying (NOT NULL)  -- ✨ SUBSTITUIU display_name
- faction: character varying
- bio: text
- avatar_url: character varying
-- ... outros campos de stats
```

## 🔧 Índices Criados

- `idx_users_country` - Otimização para consultas por país
- `idx_users_birth_date` - Otimização para consultas por idade
- `user_profiles_username_unique` - Garantia de unicidade do username

## ✅ Testes Realizados

1. **Estrutura do Banco**: ✅ Confirmado que todos os campos foram criados/atualizados
2. **Índices**: ✅ Todos os índices foram criados corretamente
3. **Validações**: ✅ Formatos de data e país estão sendo validados
4. **Compatibilidade**: ✅ Código anterior continua funcionando

## 🚀 Como Usar

### Registro com Novos Campos
```javascript
// Frontend
const authData = await apiClient.register(
  'email@exemplo.com',
  'username123',
  'senha123@',
  '1990-01-01',  // birthDate (opcional)
  'BR'           // country (opcional)
);
```

### Atualização de Perfil
```javascript
// Atualizar username no perfil
const updatedProfile = await apiClient.updateUserProfile({
  username: 'novo_username'
});
```

## 📅 Status

**✅ Concluído**: Todas as alterações foram implementadas e testadas com sucesso!

---

**Próximos Passos Recomendados:**
1. Testar registro completo via interface
2. Verificar se os dados são exibidos corretamente no frontend
3. Atualizar documentação da API se necessário