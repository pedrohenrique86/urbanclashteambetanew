Regras de Governança da Instância de IA:
Essas REGRAS devem ser seguidas o tempo todo.

Este documento define princípios operacionais obrigatórios para todas as instâncias de IA. Ele garante comportamento consistente, execução robusta e colaboração segura em todas as tarefas e serviços.

Padrões de Qualidade de Código

Todos os scripts devem implementar tratamento estruturado de erros com modos de falha específicos.

Cada função deve incluir uma docstring concisa e orientada a objetivos.

Os scripts devem verificar as pré-condições antes de executar operações críticas ou irreversíveis.

Operações de longa duração devem implementar mecanismos de tempo limite e cancelamento.

Operações de arquivo e caminho devem verificar a existência e as permissões antes de conceder acesso.

⸻

Protocolos de Documentação

A documentação deve ser sincronizada com as alterações no código - sem referências desatualizadas.

Os arquivos Markdown devem usar hierarquias de títulos e formatos de seção consistentes.

Trechos de código na documentação devem ser executáveis, testados e refletir casos de uso reais.

Cada documento deve descrever claramente: propósito, uso, parâmetros e exemplos.

Termos técnicos devem ser explicados inline ou vinculados a uma definição canônica.

⸻

Regras de Gerenciamento de Tarefas

As tarefas devem ser claras, específicas e acionáveis - evite ambiguidade.

Cada tarefa deve ser atribuída a um agente responsável, explicitamente marcado.

Tarefas complexas devem ser divididas em subtarefas atômicas e rastreáveis.

Nenhuma tarefa pode entrar em conflito ou ignorar o comportamento validado do sistema existente.

Tarefas relacionadas à segurança devem passar por revisão obrigatória por um agente revisor designado.

Os agentes devem atualizar o status e os resultados das tarefas no arquivo de tarefas compartilhado.

As dependências entre as tarefas devem ser explicitamente declaradas.

Os agentes devem escalar tarefas ambíguas, contraditórias ou sem escopo para esclarecimentos.

⸻

Diretrizes de Conformidade de Segurança

Credenciais hardcoded são estritamente proibidas - use mecanismos de armazenamento seguro.

Todas as entradas devem ser validadas, sanitizadas e verificadas quanto ao tipo antes do processamento.

Evite usar eval, chamadas de shell não sanitizadas ou qualquer forma de vetores de injeção de comando.

As operações de arquivo e processo devem seguir o princípio do menor privilégio.

Todas as operações confidenciais devem ser registradas, excluindo valores de dados confidenciais.

Os agentes devem verificar as permissões em nível de sistema antes de acessar serviços ou caminhos protegidos.

⸻

Requisitos de Execução de Processos

Os agentes devem registrar todas as ações com a gravidade apropriada (INFO, WARNING, ERROR, etc.).

Qualquer tarefa com falha deve incluir um relatório de erro claro e legível por humanos.

Os agentes devem respeitar os limites de recursos do sistema, especialmente o uso de memória e CPU.

Tarefas de longa duração devem expor indicadores de progresso ou pontos de verificação.

A lógica de repetição deve incluir retrocesso exponencial e limites de falha.

⸻

Princípios Operacionais Essenciais

Os agentes nunca devem usar dados simulados, de fallback ou sintéticos em tarefas de produção.

A lógica de tratamento de erros deve ser projetada usando princípios de teste primeiro.

Os agentes devem sempre agir com base em evidências verificáveis, não em suposições.

Todas as pré-condições devem ser explicitamente validadas antes de qualquer operação destrutiva ou de alto impacto.

Todas as decisões devem ser rastreáveis ​​para logs, dados ou arquivos de configuração.

⸻

Princípios da Filosofia de Design

KISS (Keep It Simple, Stupid - Mantenha Simples, Idiota)
• As soluções devem ser diretas e fáceis de entender.
• Evite engenharia excessiva ou abstração desnecessária.
• Priorize a legibilidade e a capacidade de manutenção do código.

YAGNI (You Aren’t Gonna Need It - Você Não Vai Precisar Disso)
• Não adicione recursos especulativos ou à prova de futuro, a menos que seja explicitamente necessário.
• Concentre-se apenas nos requisitos e entregas imediatas.
• Minimize o inchaço do código e a dívida técnica de longo prazo.

Princípios SOLID

Princípio da Responsabilidade Única - cada módulo ou função deve fazer apenas uma coisa.

Princípio Aberto-Fechado - as entidades de software devem estar abertas para extensão, mas fechadas para modificação.

Princípio da Substituição de Liskov - as classes derivadas devem ser substituíveis por seus tipos base.

Princípio da Segregação de Interface - prefira muitas interfaces específicas em vez de uma interface de uso geral.

Princípio da Inversão de Dependência - dependa de abstrações, não de implementações concretas.

⸻

Diretrizes de Extensão do Sistema

Todos os novos agentes devem estar em conformidade com as estruturas de interface, registro e tarefas existentes.

As funções utilitárias devem ser testadas unitariamente e revisadas por pares antes do uso compartilhado.

Todas as alterações de configuração devem ser refletidas no manifesto do sistema com carimbos de versão.

Novos recursos devem manter a compatibilidade com versões anteriores, a menos que justificados e documentados.

Todas as alterações devem incluir uma avaliação do impacto no desempenho.

⸻

Procedimentos de Garantia de Qualidade

Um agente revisor deve revisar todas as alterações envolvendo segurança, configuração do sistema ou funções de agente.

A documentação deve ser revisada quanto à clareza, consistência e correção técnica.

A saída voltada para o usuário (logs, mensagens, erros) deve ser clara, não técnica e acionável.

Todas as mensagens de erro devem sugerir caminhos de correção ou etapas de diagnóstico.

Todas as atualizações importantes devem incluir um plano de reversão ou mecanismo de reversão seguro.

⸻

Regras de Teste e Simulação

Toda nova lógica deve incluir testes unitários e de integração.

Dados simulados ou de teste devem ser claramente marcados e nunca promovidos para produção.

Todos os testes devem passar em pipelines de integração contínua antes da implantação.

A cobertura do código deve exceder os limites definidos (por exemplo, 85%).

Os testes de regressão devem ser definidos e executados para todas as atualizações de alto impacto.

Os agentes devem registrar os resultados dos testes em logs de teste separados, não em logs de produção.

⸻

Rastreamento de Alterações e Governança

Todas as alterações de configuração ou regras devem ser documentadas no manifesto do sistema e no changelog.

Os agentes devem registrar a fonte, o carimbo de data/hora e a justificativa ao modificar ativos compartilhados.

Todas as atualizações devem incrementar a versão interna do sistema, quando aplicável.

Um plano de reversão ou desfazer deve ser definido para cada alteração importante.

As trilhas de auditoria devem ser preservadas para todas as operações de modificação de tarefas.
