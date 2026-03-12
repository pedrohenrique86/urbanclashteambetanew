# Soluções Permanentes para Estabilidade dos Serviços

Este documento apresenta soluções para manter o backend e frontend do UrbanClash rodando de forma estável, evitando o problema de "Failed to fetch" e "Link de confirmação inválido".

## 🚀 Opções Disponíveis

### 1. Script PowerShell Avançado (Recomendado)

**Comando:**
```bash
npm run services:start
```

**Características:**
- ✅ Monitoramento automático dos serviços
- ✅ Reinicialização automática se algum serviço parar
- ✅ Verificação de saúde das portas 3000 e 3001
- ✅ Limpeza automática de processos órfãos
- ✅ Interface com status em tempo real
- ✅ Encerramento limpo com Ctrl+C

**Como usar:**
1. Abra PowerShell como Administrador
2. Navegue até a pasta do projeto
3. Execute: `npm run services:start`
4. Mantenha a janela aberta
5. Para parar: pressione Ctrl+C

### 2. Script Batch Simples

**Comando:**
```bash
npm run services:start-simple
```

**Características:**
- ✅ Fácil de usar
- ✅ Abre janelas separadas para backend e frontend
- ✅ Limpeza automática de portas
- ⚠️ Reinicialização manual necessária

**Como usar:**
1. Execute: `npm run services:start-simple`
2. Duas janelas se abrirão (backend e frontend)
3. Mantenha ambas as janelas abertas
4. Para parar: feche as janelas ou pressione Ctrl+C em cada uma

### 3. Docker (Para Ambiente de Produção)

**Comandos:**
```bash
# Iniciar
npm run services:docker

# Parar
npm run services:docker-stop
```

**Características:**
- ✅ Isolamento completo
- ✅ Reinicialização automática
- ✅ Configuração de produção
- ⚠️ Requer Docker instalado

## 🔧 Configurações Importantes

### Variáveis de Ambiente

Certifique-se de que o arquivo `.env` contém:
```env
VITE_API_URL=http://localhost:3001/api
FRONTEND_URL=http://localhost:3000
```

### Portas Utilizadas
- **Frontend:** 3000
- **Backend:** 3001
- **PostgreSQL:** 5432

## 🐛 Solução de Problemas

### Problema: "Failed to fetch"
**Causa:** Backend não está rodando
**Solução:** Use uma das soluções permanentes acima

### Problema: "Link de confirmação inválido"
**Causa:** Backend parou durante o processo de confirmação
**Solução:** Use o script PowerShell que monitora e reinicia automaticamente

### Problema: Porta em uso
**Causa:** Processo anterior não foi encerrado corretamente
**Solução:** Os scripts fazem limpeza automática das portas

### Problema: PowerShell não executa scripts
**Solução:** Execute como Administrador:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📋 Checklist de Verificação

Antes de usar as soluções:
- [ ] Node.js instalado
- [ ] NPM dependencies instaladas (`npm install`)
- [ ] PostgreSQL rodando (local ou Docker)
- [ ] Arquivo `.env` configurado
- [ ] Portas 3000 e 3001 livres

## 🎯 Recomendação Final

Para **uso diário de desenvolvimento**, recomendamos:
1. **Script PowerShell** (`npm run services:start`) - Mais robusto
2. **Script Batch** (`npm run services:start-simple`) - Mais simples

Para **produção ou testes avançados**:
1. **Docker** (`npm run services:docker`) - Mais estável

## 📞 Suporte

Se ainda encontrar problemas:
1. Verifique se todas as dependências estão instaladas
2. Confirme se o PostgreSQL está rodando
3. Teste cada serviço individualmente
4. Verifique os logs nas janelas dos serviços

---

**Nota:** Estas soluções foram criadas especificamente para resolver o problema de instabilidade dos serviços que causava erros de confirmação de email e "Failed to fetch".