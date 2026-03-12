# 🚀 Gerenciamento de Serviços com PM2

Este projeto agora inclui scripts para manter o backend e frontend sempre ativos usando PM2, um gerenciador de processos profissional para aplicações Node.js.

## 📋 O que é PM2?

PM2 é um gerenciador de processos de produção para aplicações Node.js com balanceador de carga integrado. Ele permite manter aplicações sempre ativas, recarregá-las sem tempo de inatividade e facilitar tarefas comuns de administração do sistema.

## 🎯 Vantagens do PM2

- ✅ **Auto-restart**: Reinicia automaticamente se a aplicação falhar
- ✅ **Logs centralizados**: Todos os logs em um local
- ✅ **Monitoramento**: Status em tempo real dos processos
- ✅ **Zero downtime**: Reinicialização sem interrupção
- ✅ **Gerenciamento de memória**: Reinicia se exceder limite de memória
- ✅ **Startup script**: Inicia automaticamente com o sistema

## 🚀 Como Iniciar os Serviços

### Opção 1: Scripts Independentes (Recomendado para Windows)

#### PowerShell:
```powershell
.\start-services-independent.ps1
```

#### Batch:
```cmd
start-services-independent.bat
```

**Vantagens dos Scripts Independentes:**
- Cada serviço roda em sua própria janela
- Mais estável no Windows
- Fácil de monitorar e debugar
- Não depende do PM2

### Opção 2: PM2 (Para usuários avançados)

#### Script PowerShell:
```powershell
.\start-all-services.ps1
```

#### Script Batch:
```cmd
start-all-services.bat
```

### Parar todos os serviços

**PowerShell:**
```powershell
.\stop-all-services.ps1
```

**Batch:**
```cmd
stop-all-services.bat
```

## 📊 Comandos PM2 úteis

Após iniciar os serviços, você pode usar estes comandos:

```bash
# Ver status de todos os processos
pm2 status

# Ver logs em tempo real
pm2 logs

# Ver logs de um processo específico
pm2 logs urbanclash-backend
pm2 logs urbanclash-frontend

# Reiniciar todos os processos
pm2 restart all

# Reiniciar um processo específico
pm2 restart urbanclash-backend
pm2 restart urbanclash-frontend

# Parar todos os processos
pm2 stop all

# Parar um processo específico
pm2 stop urbanclash-backend
pm2 stop urbanclash-frontend

# Remover todos os processos
pm2 delete all

# Monitoramento em tempo real
pm2 monit
```

## 🔧 Configuração

A configuração está no arquivo `ecosystem.config.js`:

- **Backend**: Roda na porta 3001
- **Frontend**: Roda na porta 3000
- **Logs**: Salvos na pasta `logs/`
- **Auto-restart**: Habilitado
- **Limite de memória**: 1GB por processo

## 📁 Estrutura de Logs

### PM2 (quando usando scripts PM2):
```
logs/
├── backend-out.log      # Saída do backend
├── backend-err.log      # Erros do backend
├── backend-combined.log # Logs combinados do backend
├── frontend-out.log     # Saída do frontend
├── frontend-err.log     # Erros do frontend
└── frontend-combined.log # Logs combinados do frontend
```

### Scripts Independentes:
Os logs aparecem diretamente nas janelas do terminal de cada serviço.

## 🔗 URLs dos Serviços

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **API Rankings**: http://localhost:3001/api/clans/rankings
- **Health Check**: http://localhost:3001/health

## 🛠️ Solução de Problemas

### PM2 não encontrado
Se você receber erro "PM2 não encontrado", execute:
```bash
npm install -g pm2
```

### Porta em uso
Se as portas estiverem em uso, pare os processos:
```bash
pm2 stop all
pm2 delete all
```

### Verificar se os serviços estão rodando
```bash
pm2 status
```

### Reiniciar após mudanças no código
```bash
pm2 restart all
```

## 🎯 Benefícios para Desenvolvimento

1. **Sem mais "loop infernal"**: Os serviços ficam sempre ativos
2. **Logs organizados**: Fácil debug com logs separados
3. **Restart automático**: Se algo falhar, reinicia sozinho
4. **Monitoramento**: Veja CPU, memória e status em tempo real
5. **Produtividade**: Foque no código, não no gerenciamento de processos

## 🚀 Próximos Passos

Após executar `start-all-services`, seus serviços estarão sempre ativos. Você pode:

1. Desenvolver normalmente
2. Fazer mudanças no código
3. Usar `pm2 restart all` para aplicar mudanças
4. Monitorar com `pm2 logs` ou `pm2 monit`

**Agora você tem um ambiente de desenvolvimento profissional! 🎉**