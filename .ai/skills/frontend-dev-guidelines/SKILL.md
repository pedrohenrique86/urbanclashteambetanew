---
name: frontend-dev-guidelines
description: "Use when managing the frontend structure and assets in the UrbanClash Team project."
category: frontend-dev
risk: low
source: workspace
date_added: "2026-04-02"
metadata:
  triggers: frontend, assets, vite, tailwind, assets, routing, axios, path-aliases
---

# Frontend Dev Guidelines (UrbanClash Team)

General frontend architectural rules for the UrbanClash Team project.

## 🛠️ Tooling and Infrastructure

### Vite
- The project uses Vite for fast development and bundling.
- Configuration is in `frontend/vite.config.ts`.
- Note: Proxy is configured for `/api` to `http://localhost:3001` in development.

### Path Aliases
- Use aliases defined in `tsconfig.json` to simplify imports:
    - `@/components/*`: UI components.
    - `@/services/*`: API service layers.
    - `@/lib/*`: Utility/General library functions.
    - `@/pages/*`: Route-level components.

### Axios Singleton
- Use the shared axios instance in `src/lib/api.ts` for consistency.
- It includes the base URL and can handle interceptors for auth tokens.

```typescript
import api from '@/lib/api';

const fetchPlayers = async () => {
    const { data } = await api.get('/players');
    return data;
};
```

## 🗺️ Routing (React Router DOM)
- Define all routes in `src/App.tsx`.
- Use a `ProtectedRoute` component for pages requiring authentication.
- Navigation should use the `<Link>` or `useNavigate` hook.

```tsx
import { Link } from 'react-router-dom';

<Link to="/profile">My Profile</Link>
```

## 🎨 Asset Management
- Place public assets (images, icons) in `frontend/public/`.
- Use SVG components where possible for scalability and performance.
- Icons should follow a consistent set (check for existing libraries before adding new ones).

## 🛡️ Best Practices
- **Strict TypeScript**: Never use `any`. Always specify types or interfaces.
- **Component Decomposition**: Keep components small and specialized.
- **Loading/Error States**: Always handle asynchronous operations' states (pending, error, success).
- **Responsive-First**: Design for mobile/responsive views using Tailwind's breakpoint prefixes (`sm:`, `md:`, `lg:`).
