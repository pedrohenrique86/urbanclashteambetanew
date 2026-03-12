# 🛠️ Helper de Desenvolvimento - Tokens de Email

## 📋 Visão Geral

Este helper resolve o problema de **tokens de confirmação de uso único** durante o desenvolvimento, fornecendo uma maneira rápida e eficiente de gerar novos tokens sempre que necessário.

## ❌ Problema Resolvido

- ✅ **Tokens frescos automaticamente** - Gera novos tokens quando necessário
- ✅ **Evita reutilização** - Cada teste usa um token único
- ✅ **Limpeza automática** - Remove tokens antigos automaticamente
- ✅ **Interface simples** - Comandos npm fáceis de usar

## 🚀 Como Usar

### Comandos Rápidos (npm)

```bash
# Criar novo token de teste
npm run dev:token

# Listar tokens ativos
npm run dev:token-list

# Limpar tokens antigos
npm run dev:token-clean

# Teste completo (criar + testar API)
npm run dev:token-test
```

### Comandos Diretos

```bash
# Criar novo token
node dev_email_helper.js new

# Ver tokens disponíveis
node dev_email_helper.js list

# Limpar tokens antigos (>1 hora)
node dev_email_helper.js clean

# Teste rápido completo
node dev_email_helper.js test
```

## 📖 Fluxo de Desenvolvimento

### 1. **Desenvolvimento Normal**
```bash
# Quando precisar testar confirmação de email:
npm run dev:token

# Copie o link gerado e teste no navegador
# Exemplo: http://localhost:3000/email-confirmation?token=dev-token-1234567890-abc123
```

### 2. **Teste Automatizado**
```bash
# Para teste completo (backend + frontend):
npm run dev:token-test
```

### 3. **Limpeza Periódica**
```bash
# Remove tokens antigos para manter o banco limpo:
npm run dev:token-clean
```

## 📊 Exemplo de Saída

```
🔄 Criando novo token de desenvolvimento...
✅ Token criado com sucesso!
📧 Email: dev-test-1750647890123@example.com
👤 Username: devuser1750647890123
🎫 Token: dev-token-1750647890123-a1b2c3
🔗 Link de teste:
   http://localhost:3000/email-confirmation?token=dev-token-1750647890123-a1b2c3
```

## 🔧 Configuração

O helper usa automaticamente as configurações do `backend/.env`:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

## 🧹 Limpeza Automática

- Tokens de desenvolvimento são prefixados com `dev-test-`
- Tokens antigos (>1 hora) são removidos automaticamente
- Não afeta usuários reais do sistema

## 🔒 Segurança

- ✅ **Apenas para desenvolvimento** - Tokens são claramente marcados
- ✅ **Não afeta produção** - Usa emails `@example.com`
- ✅ **Limpeza automática** - Remove dados de teste automaticamente
- ✅ **Isolado** - Não interfere com usuários reais

## 💡 Vantagens

1. **Eficiência**: Gera tokens em segundos
2. **Simplicidade**: Um comando npm resolve tudo
3. **Segurança**: Mantém o comportamento de segurança original
4. **Limpeza**: Remove automaticamente dados de teste
5. **Flexibilidade**: Múltiplos comandos para diferentes necessidades

## 🎯 Casos de Uso

- **Desenvolvimento de features** relacionadas a confirmação de email
- **Testes manuais** do fluxo de confirmação
- **Debugging** de problemas de confirmação
- **Demonstrações** para clientes/equipe

---

**✨ Resultado**: Desenvolvimento eficiente sem comprometer a segurança do sistema!