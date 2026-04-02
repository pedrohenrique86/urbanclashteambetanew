---
name: react-best-practices
description: "Use when creating or modifying React components in the UrbanClash Team project."
category: frontend
risk: low
source: workspace
date_added: "2026-04-02"
metadata:
  triggers: react, hooks, component, swr, vite, tailwind
---

# React Best Practices (UrbanClash Team)

Guidelines for React development specifically adapted to the UrbanClash Team tech stack.

## 🏗️ Standards and Architecture

### Functional Components
- Always use functional components with arrow functions.
- Define prop types using TypeScript **Interfaces** (preferred over Types).

```tsx
interface CardProps {
  title: string;
  count: number;
}

export const Card: React.FC<CardProps> = ({ title, count }) => {
  return (
    <div className="p-4 border">
      <h3>{title}</h3>
      <p>{count}</p>
    </div>
  );
};
```

### Data Fetching (SWR)
- Use `swr` for all server-side data fetching. This provides cache, revalidation, and loading states.
- Wrap SWR hooks in a service if it's complex, or use them directly for simple data.

```tsx
import useSWR from 'swr';
import { fetcher } from '@/lib/api';

const { data, error, isLoading } = useSWR('/api/player/profile', fetcher);
```

### Styling (Tailwind CSS)
- Use utility classes primarily.
- Follow the project's theme colors (check `frontend/tailwind.config.cjs`).
- Implement Responsive Design and Dark Mode where applicable.

### WebSocket (Socket.IO)
- Use `socket.io-client` for real-time events.
- Ensure proper connection management (e.g., in a Context or high-level hook).

## 🚀 Performance
- Use `React.memo` for expensive components.
- Use `useCallback` and `useMemo` sparingly, only when profiling shows a need or for dependency stability in hooks.
- Keep the component hierarchy shallow and focused.

## 🛡️ Security
- Never expose sensitive tokens in frontend code (use `.env` and `Vite`'s `IMPORT_META_ENV`).
- Sanitize user input before rendering if not handled by React's default protection.
