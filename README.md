# InovaCalc App — Mobile SST

Aplicativo mobile do sistema InovaCalc, desenvolvido com Expo + React Native para consultores SST da Inovassie.

## Visão Geral

Versão mobile do InovaCalc que permite criar orçamentos, calcular planos e treinamentos SST, gerenciar empresas e acompanhar notificações — diretamente do smartphone.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Expo SDK ~54 + Expo Router ~6 |
| Runtime | React Native 0.81 (New Architecture) |
| Linguagem | TypeScript (strict) |
| Estilização | NativeWind v4 + Design System próprio |
| Backend / BaaS | Supabase JS v2 (AsyncStorage session) |
| Estado global | Zustand v5 |
| Servidor de estado | TanStack Query v5 |
| Ícones | @tabler/icons-react-native |
| Fontes | Inter (400 + 500) via @expo-google-fonts |
| SVG | react-native-svg + transformer |
| Gestos | react-native-gesture-handler + reanimated |

---

## Estrutura de Pastas

```
app/
├── _layout.tsx              # Root layout: fonts, SafeArea, TanStack, AuthGate
├── (auth)/
│   ├── login.tsx            # Tela de login
│   └── forgot-password.tsx  # Recuperação de senha
├── (app)/
│   ├── _layout.tsx          # Layout autenticado
│   ├── index.tsx            # Dashboard (home)
│   ├── profile.tsx          # Perfil do usuário + upload de avatar
│   ├── notifications.tsx    # Central de notificações
│   ├── settings.tsx         # Configurações
│   ├── companies/
│   │   ├── index.tsx        # Lista de empresas
│   │   └── new.tsx          # Cadastro / edição de empresa
│   ├── quotes/
│   │   ├── index.tsx        # Histórico de orçamentos
│   │   └── new.tsx          # Novo orçamento (multi-step)
│   └── calculator/
│       ├── plans.tsx        # Calculadora de planos SST
│       └── trainings.tsx    # Calculadora de treinamentos NR
└── quote/
    ├── select-company.tsx   # Seleção de empresa para orçamento
    └── what-include.tsx     # Seleção de serviços

src/
├── components/
│   ├── ui/                  # Button, Card, Badge, Input, Avatar,
│   │   │                    # BottomSheet, Segmented, Toggle,
│   │   │                    # CategoryIcon, Counter, ProgressBar
│   └── layout/              # Header, BottomNav, SafeContainer
├── stores/
│   ├── authStore.ts         # Sessão, profile, signIn, signOut
│   ├── quoteDraftStore.ts   # Rascunho de orçamento em criação
│   └── notificationsStore.ts# Notificações com Zustand (persistente na sessão)
├── hooks/
│   ├── useCompanies.ts      # TanStack Query para empresas
│   ├── useQuotes.ts         # TanStack Query para orçamentos
│   └── useSettings.ts       # Configs: planos, GHE, treinamentos, descontos
├── lib/
│   ├── supabase.ts          # Cliente Supabase com AsyncStorage
│   ├── calculations.ts      # Lógica de cálculo de planos e treinamentos
│   ├── constants.ts         # GHE defaults, plan configs, status configs
│   └── format.ts            # Formatações PT-BR (moeda, data, CNPJ, telefone)
├── theme/
│   ├── colors.ts            # Paleta completa (#042C53 navy + neutros)
│   ├── typography.ts        # Escala tipográfica Inter
│   ├── spacing.ts           # Espaçamentos
│   └── index.ts             # Export unificado
└── types/
    └── database.ts          # Types: Profile, Company, Quote, PlanConfig, etc.
```

---

## Design System

### Cores principais

| Token | Valor | Uso |
|-------|-------|-----|
| `colors.primary[900]` | `#042C53` | Headers, botões primários |
| `colors.primary[600]` | `#0A4A8C` | Acentos, links |
| `colors.neutral.white` | `#FFFFFF` | Fundos de card |
| `colors.neutral.gray50` | `#F8FAFC` | Background de tela |

### Fontes

- `Inter_400Regular` — textos e labels
- `Inter_500Medium` — títulos e destaques

### Componentes UI

| Componente | Descrição |
|-----------|-----------|
| `Button` | Botão com loading state e ícone opcional |
| `Card` | Container com variantes: default, flat, selected |
| `Badge` | Status colorido (DRAFT, SENT, APPROVED, etc.) |
| `Input` | Campo com label, ícone e estado de erro |
| `Avatar` | Imagem circular com fallback de iniciais |
| `BottomSheet` | Modal deslizante com handle |
| `Segmented` | Filtro horizontal em pills |
| `CategoryIcon` | Ícone com fundo colorido por categoria |

---

## Banco de Dados (Supabase)

Compartilhado com o projeto web. Project ref: `zhluarirmpcdqclqybfr`

### Storage

| Bucket | Tipo | Uso |
|--------|------|-----|
| `avatars` | Público | Fotos de perfil dos usuários |

As políticas RLS do Storage permitem que cada usuário gerencie apenas seus próprios arquivos em `avatars/{user_id}/`.

---

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

---

## Instalação e Execução

```bash
# Instalar dependências
bun install

# Rodar o servidor Metro
bunx expo start

# Abrir no emulador Android
bunx expo start --android

# Abrir no simulador iOS
bunx expo start --ios

# Limpar cache e reiniciar
bunx expo start --clear
```

---

## Configuração do Emulador Android

O projeto usa o Android SDK localizado em `C:\AndroidStudioAquivos\`. Os AVDs estão em `C:\AndroidAVD\.android\avd\`.

Para abrir o emulador via adb:

```bash
# Listar dispositivos conectados
adb devices

# Abrir app no emulador
adb shell am start -a android.intent.action.VIEW -d "exp://10.0.2.2:8081"
```

---

## Regras de Negócio

Mesmas do projeto web:

- **GHE**: lookup por risco + faixa de funções (5, 10, 20)
- **Margens**: G1 = 40% · G2/G3 = 60% · G4 = 80%
- **Imposto**: 8% sobre subtotal
- **CIPA**: inclusa no Avançado a partir de certo nº de funcionários
- **Integração Geral**: zera NR-01, NR-06 e NR-17

---

## Licença

Propriedade da **Inovassie**. Todos os direitos reservados.
