# InovaCalc Mobile — Arquitetura Técnica

## Visão Geral

Aplicativo React Native (Expo SDK 54) para a equipe comercial da Inovassie.
Permite criar orçamentos de SST (planos + treinamentos), gerenciar empresas e
consultar histórico — com suporte a uso offline quando sem conexão.

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework | Expo ~54 + Expo Router ~6 |
| Runtime | React Native 0.81 + New Architecture |
| Estilo | NativeWind v4 + design system próprio (`src/theme/`) |
| Auth + DB | Supabase JS v2 (AsyncStorage session) |
| Estado servidor | TanStack Query v5 + persist (7 dias) |
| Estado local | Zustand v5 |
| Formulários | React Hook Form + Zod |
| Build/Deploy | EAS Build (Expo Application Services) |

---

## Estrutura de Pastas

```
calculadoraInovassie/
├── app/
│   ├── _layout.tsx          # Root: QueryClient, AuthGate, network setup
│   ├── (auth)/              # Telas não autenticadas (login, forgot-password)
│   ├── (app)/               # Telas autenticadas (guarda por session)
│   │   ├── _layout.tsx      # NetworkBanner + Stack
│   │   ├── index.tsx        # Dashboard
│   │   ├── companies/       # CRUD de empresas
│   │   ├── quotes/          # Histórico de orçamentos
│   │   └── calculator/      # Calculadoras independentes (planos, treinamentos)
│   └── quote/               # Wizard de criação de orçamento (multi-step)
├── src/
│   ├── components/
│   │   ├── layout/          # Header, BottomNav, SafeContainer
│   │   └── ui/              # Button, Card, Badge, ErrorState, NetworkBanner...
│   ├── hooks/               # useCompanies, useQuotes, useSettings
│   ├── lib/
│   │   ├── supabase.ts      # Cliente Supabase configurado
│   │   ├── logger.ts        # Logger estruturado (DEBUG/INFO/WARN/ERROR)
│   │   ├── network.ts       # Setup AppState → TanStack onlineManager
│   │   ├── sync.ts          # Motor de sincronização (outbox flush)
│   │   ├── calculations.ts  # Lógica de cálculo SST
│   │   └── format.ts        # Formatações pt-BR
│   ├── stores/
│   │   ├── authStore.ts     # Zustand: sessão, profile, login/logout
│   │   ├── quoteDraftStore.ts # Zustand: wizard de orçamento (em memória)
│   │   ├── outboxStore.ts   # Zustand + persist: fila offline (AsyncStorage)
│   │   └── notificationsStore.ts
│   ├── theme/               # Cores, tipografia, espaçamento
│   └── types/
│       └── database.ts      # Tipos TypeScript espelhando o schema Postgres
```

---

## Fluxo de Autenticação

```
App inicia
    │
    ├─ setupNetworkManager()  ← configura AppState → TanStack onlineManager
    │
    ├─ QueryClient criado (networkMode: offlineFirst, gcTime: 7d)
    │
    └─ AuthGate monta
           │
           ├─ useAuthStore.initialize()
           │       │
           │       ├─ supabase.auth.getSession() ← lê AsyncStorage
           │       ├─ set({ session, initialized: true })
           │       └─ loadProfile() se sessão existe
           │
           └─ useEffect([initialized, session])
                   ├─ sem sessão → router.replace('/(auth)/login')
                   └─ com sessão → router.replace('/(app)')
```

### Por que `initialized` importa?

Todos os hooks de dados (`useCompanies`, `useQuotes`, `useSettings`) têm:

```typescript
enabled: initialized && !!session
```

Sem esse guard, as queries disparariam com token ausente → RLS do Supabase
bloquearia silenciosamente → telas aparecem vazias.

---

## Modo Offline

### Leitura offline (cache)

O `PersistQueryClientProvider` persiste o cache no AsyncStorage com TTL de 7 dias.
Quando offline, as queries servem dados do cache automaticamente
(`networkMode: 'offlineFirst'`).

```
Sem rede → query retorna dados do cache → UI exibe normalmente
           (sem spinner, sem erro — dados podem estar desatualizados)
```

### Escrita offline (outbox)

Mutações de empresas e orçamentos passam pelo `outboxStore`:

```
Criar empresa
    │
    ├─ [online] → supabase.insert() → sucesso → queryClient.invalidate()
    │
    └─ [offline ou erro de rede]
           │
           ├─ outbox.enqueue({ type: 'company.create', tempId, payload })
           ├─ tempId aparece imediatamente na lista (merge local)
           └─ flushOutbox() tenta enviar quando a rede volta
```

O `flushOutbox()` é chamado:
- No boot do app (se há sessão)
- A cada 30 segundos
- Manualmente via NetworkBanner "Enviar agora"
- Rate limit: mínimo 5s entre flushes

---

## Segurança

| Item | Implementação |
|---|---|
| Autenticação | Supabase Auth (JWT, refresh automático) |
| Autorização | Row Level Security (PostgreSQL) em todas as tabelas |
| Chaves no app | Apenas `ANON_KEY` (segura por design — acesso controlado pelo RLS) |
| Service role key | **NUNCA** no app mobile — somente em Edge Functions |
| Dados offline | AsyncStorage local do dispositivo (criptografado pelo SO) |
| Rate limiting client | `flushOutbox`: 5s de intervalo mínimo |

### Políticas RLS relevantes

- `companies`: SELLER vê apenas empresas que criou; ADMIN/MANAGER veem todas
- `quotes`: SELLER vê apenas orçamentos que criou; ADMIN/MANAGER veem todos
- `plan_configs`, `ghe_table`, `trainings`: leitura para todos autenticados
- `profiles`: usuário vê/edita apenas o próprio; ADMIN gerencia todos

---

## Sistema de Logs

```typescript
import { logger } from '@/lib/logger';

logger.debug('tag', 'mensagem', dados_extras);  // só em __DEV__
logger.info('tag', 'mensagem');
logger.warn('tag', 'atenção', erro);
logger.error('tag', 'falha crítica', erro);

// Acessa buffer de logs em memória (últimas 300 entradas)
const logs = logger.getLogs();
```

Em `__DEV__`: todos os níveis aparecem no console Metro com cores ANSI.
Em produção: apenas `WARN` e `ERROR` chegam ao console.

---

## Build e Deploy

### APK interno (sem Play Store)

```bash
cd calculadoraInovassie
eas build --profile preview --platform android
```

O APK é disponibilizado para download na dashboard do Expo (expo.dev).

### Variáveis de ambiente (EAS)

As variáveis precisam estar em `.env` local E configuradas no EAS:

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
```

**IMPORTANTE**: A `ANON_KEY` é pública por design (o Supabase documenta isso).
O controle de acesso real é feito pelo RLS, não pela chave.

---

## Wizard de Orçamento (multi-step)

```
/quote/select-company   → draft.setCompany(company)
/quote/what-include     → draft.toggleInclude('plan'|'trainings'|'extras')
/quote/configure-plan   → draft.setPlanConfig({ riskGrade, ... })
/quote/select-plan      → draft.setSelectedPlan('ESSENCIAL'|...)
/quote/trainings        → draft.setTrainings([{ trainingId, quantity }])
/quote/summary          → useCreateQuote.mutateAsync({ draft, configs, ghe })
```

O `quoteDraftStore` é **em memória** (sem persistência). Se o app fechar durante
a wizard, o rascunho é perdido. Isso é intencional — evita estados inconsistentes.

---

## Diagnóstico de Problemas

### Telas aparecem vazias

1. Verificar se `.env` tem `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`
2. Abrir Metro e verificar logs `[INFO][authStore]` — sessão sendo restaurada?
3. Verificar `[INFO][useCompanies]` — query foi habilitada?
4. No Supabase Dashboard → Authentication → verificar se o usuário existe e está ativo

### Empresa criada não aparece

- Se online: verificar logs `[INFO][sync]` — insert retornou erro?
- Se offline: verificar `outboxStore` — op está na fila com `status: 'pending'`?
- Após conectar: toque "Enviar agora" no NetworkBanner ou aguarde o flush automático

### Erro ao fazer login

- Verificar se a senha está correta no painel web (Settings → Usuários)
- Verificar se `is_active = true` na tabela `profiles`
