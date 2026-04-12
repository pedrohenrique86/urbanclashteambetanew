# ⚙️ CODE MODE — Execução de Código com Fallback Seguro (Gemini)

Este arquivo define como o Gemini Code Assist deve se comportar ao gerar ou modificar código.

---

## 🎯 OBJETIVO

- **Entrega de Código Funcional:** Gerar código que seja diretamente aplicável e alinhado com as tecnologias do projeto (React/TypeScript no frontend, Node.js/Express no backend).
- **Autonomia com Segurança:** Utilizar o modo de execução para aplicar alterações de forma autônoma, sempre que possível, mas com mecanismos de fallback para garantir a integridade do código.
- **Consistência Arquitetural:** Seguir rigorosamente as decisões definidas no `DECISIONS.md` para manter a consistência do monorepo.

---

## 🧠 MODO DE OPERAÇÃO: FOCO NA EXECUÇÃO

O Gemini deve operar em **modo de execução**, priorizando a aplicação de código sobre a explicação.

1.  **Analisar:** Entender a solicitação e consultar os arquivos de contexto (`PROJECT_CONTEXT.md`, `DECISIONS.md`).
2.  **Executar:** Aplicar as alterações diretamente nos arquivos do projeto.
3.  **Confirmar:** Informar o que foi feito de forma concisa.

---

## 🚫 REGRAS ESTRITAS (NÃO FAZER)

- **Não parar na análise:** Nunca explicar o que vai ser feito sem efetivamente fazer.
- **Não enviar código parcial:** Sempre fornecer o bloco de código completo para substituição, a menos que a ferramenta de `diff` seja usada.
- **Não ignorar o workspace:** Nunca aplicar uma alteração sem especificar claramente se é no `frontend` ou `backend`.
- **Não inventar arquitetura:** Seguir os padrões de serviços, componentes e rotas já estabelecidos no `DECISIONS.md`.

---

## ✅ OBRIGATÓRIO

1. Entregar uma solução completa (aplicada ou em fallback)
2. Garantir que o código pode ser usado imediatamente
3. Trabalhar com arquivos reais do projeto (usar `@` para referenciar)
4. Seguir a arquitetura definida em `.ai`

---

## ⚡ MODO HÍBRIDO (PADRÃO)

**Prioridade 1:** Usar **Agent Mode** para aplicar as alterações diretamente nos arquivos.  
**Prioridade 2:** Se o Agent Mode não estiver disponível ou falhar, fornecer **código completo** para substituição manual.

---

## 🔥 FALLBACK OBRIGATÓRIO: CÓDIGO COMPLETO

Se a aplicação automática de código falhar por qualquer motivo (erro da ferramenta, arquivo não encontrado, etc.), o Gemini deve **imediatamente** fornecer o código completo do arquivo, pronto para ser copiado e colado.

O formato deve ser claro e indicar o caminho completo do arquivo no monorepo.

### Exemplo para um Componente React (Frontend):

```tsx c:/Users/Administrador/Documents/urbanclashteambetanew/frontend/src/components/common/Button.tsx
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
}

const Button: React.FC<ButtonProps> = ({ children, onClick }) => {
  return (
    <button onClick={onClick} className="bg-blue-500 text-white p-2 rounded">
      {children}
    </button>
  );
};

export default Button;
```

### Exemplo para um Serviço (Backend):

```javascript c:/Users/Administrador/Documents/urbanclashteambetanew/backend/services/playerService.js
import db from '../config/database.js';

const getPlayerById = async (id) => {
  const { rows } = await db.query('SELECT * FROM players WHERE id = $1', [id]);
  return rows[0];
};

export default {
  getPlayerById,
};
```

> **Nota:** O caminho do arquivo deve ser **absoluto e correto**, e a linguagem (`tsx`, `javascript`, etc.) deve ser especificada.