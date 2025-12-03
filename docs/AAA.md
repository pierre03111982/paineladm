# Ficha Técnica Completa - App Cliente Modelo 2

## 1. Visão Geral do Projeto

### Nome do Projeto
**App Cliente Modelo 2** - Experiência de Provador Virtual com IA e Controle do Display da Loja

### Objetivo Principal
Aplicativo web responsivo que permite aos clientes experimentar produtos de moda usando inteligência artificial, gerando looks personalizados e transmitindo-os para displays físicos nas lojas. O app oferece uma experiência imersiva de "Provador Virtual" e "Espelho Digital", integrando-se com o sistema de gestão da loja através de QR Codes.

### Stack Tecnológica Principal

#### Frameworks e Core
- **Next.js 14.2.33** (App Router) - Framework React com SSR/SSG
- **React 18.3.1** - Biblioteca de UI
- **TypeScript 5.3.3** - Tipagem estática

#### Bibliotecas de UI e Estilo
- **Tailwind CSS 3.4.13** - Framework CSS utility-first
- **Lucide React 0.553.0** - Ícones SVG
- **Radix UI** - Componentes acessíveis (Checkbox, Slot)
- **React Hot Toast 2.6.0** - Notificações toast
- **Class Variance Authority** - Variantes de componentes

#### Integrações e Backend
- **Firebase 12.6.0** - Backend as a Service
  - Firestore (banco de dados NoSQL)
  - Firebase Storage (armazenamento de imagens)
  - Firebase Auth (autenticação)
- **QRCode.react 4.2.0** - Geração de QR Codes

#### Ferramentas de Desenvolvimento
- **ESLint** - Linter de código
- **PostCSS** - Processamento de CSS
- **Autoprefixer** - Compatibilidade de CSS

### Plataformas Alvo
- **Web Mobile** - PWA otimizado para smartphones Android/iOS
- **Desktop/Tablet** - Layout responsivo adaptativo
- **TV/Display** - Modo dedicado para exibição em displays físicos (horizontal/vertical)

---

## 2. Arquitetura e Estrutura

### Estrutura de Diretórios

```
apps-cliente/modelo-2/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── [lojistaId]/              # Rotas dinâmicas por lojista
│   │   │   ├── experimentar/         # Tela principal de experimentação
│   │   │   ├── resultado/            # Tela de resultados e votação
│   │   │   ├── login/                # Autenticação de cliente
│   │   │   ├── tv/                   # Tela do display (DisplayView)
│   │   │   └── layout.tsx            # Layout específico do lojista
│   │   ├── api/                      # API Routes (Next.js)
│   │   │   ├── actions/              # Ações do cliente (like/dislike)
│   │   │   ├── cliente/              # Endpoints de cliente
│   │   │   ├── display/              # Atualização de display
│   │   │   ├── lojista/              # Dados do lojista
│   │   │   └── upload-photo/         # Upload de fotos
│   │   ├── demo/                     # Página de demonstração
│   │   ├── layout.tsx                # Layout raiz
│   │   └── globals.css               # Estilos globais
│   ├── components/                   # Componentes React
│   │   ├── views/                    # Views principais
│   │   │   ├── ExperimentarView.tsx  # Tela de experimentação
│   │   │   └── DisplayView.tsx       # Tela do display
│   │   ├── ui/                       # Componentes UI reutilizáveis
│   │   │   ├── Button.tsx
│   │   │   ├── SafeImage.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Checkbox.tsx
│   │   ├── SendToDisplayButton.tsx   # Botão de transmissão
│   │   ├── VideoBackground.tsx       # Background animado
│   │   └── LoadingSpinner.tsx
│   ├── hooks/                        # Custom Hooks
│   │   └── useStoreSession.ts        # Gerenciamento de sessão
│   ├── lib/                          # Utilitários e configurações
│   │   ├── firebase.ts               # Configuração Firebase
│   │   ├── firebaseQueries.ts        # Queries Firestore
│   │   ├── types.ts                  # Tipos TypeScript
│   │   └── utils.ts                  # Funções utilitárias
│   └── middleware.ts                 # Middleware Next.js
├── public/                           # Arquivos estáticos
│   ├── video2tela2.mp4              # Vídeo de fundo
│   └── images/                       # Imagens estáticas
├── docs/                             # Documentação
├── scripts/                          # Scripts de build/verificação
└── package.json                      # Dependências e scripts
```

### Fluxo de Dados Principal

#### 1. Inicialização e Autenticação
```
Usuário acessa /[lojistaId]/login
  ↓
Autenticação via WhatsApp/Senha
  ↓
API: /api/cliente/login → Backend (paineladm)
  ↓
Sessão criada → sessionStorage
```

#### 2. Fluxo de Experimentação
```
Tela Experimentar (/[lojistaId]/experimentar)
  ↓
Upload de foto → /api/upload-photo
  ↓
Seleção de produtos → Estado local (React)
  ↓
Geração de look → /api/generate-looks
  ↓
Navegação para Resultado → /[lojistaId]/resultado
```

#### 3. Conexão com Display
```
Scanner QR Code (BarcodeDetector API)
  ↓
URL parseada → Parâmetros: connect=true, lojista, target_display
  ↓
useStoreSession hook → Conecta sessão
  ↓
sessionStorage: connected_store_id, target_display
  ↓
Botão "Transmitir" aparece → SendToDisplayButton
```

#### 4. Transmissão para Display
```
Cliente clica "Transmitir"
  ↓
SendToDisplayButton → /api/display/update
  ↓
Proxy para Backend → paineladm/api/display/update
  ↓
Firebase Admin SDK → Atualiza displays/{displayUuid}
  ↓
DisplayView escuta → onSnapshot Firestore
  ↓
Imagem exibida no display físico
```

### Integrações Externas

#### Firebase
- **Firestore**: Coleções `lojistas`, `displays`, `composicoes`
- **Storage**: Armazenamento de imagens de upload e looks gerados
- **Auth**: Autenticação de clientes (opcional)

#### Backend (paineladm)
- **API REST**: Endpoints para autenticação, geração de looks, atualização de display
- **Firebase Admin SDK**: Acesso privilegiado ao Firestore (server-side)

---

## 3. Funcionalidades Chave e Módulos

### 3.1 Fluxo de Experimentação (Tela Principal)

#### Upload de Imagem
- **Componente**: `ExperimentarView.tsx`
- **Funcionalidade**:
  - Upload via input file ou câmera do dispositivo
  - Compressão automática de imagens > 1MB (redimensiona para 1920x1920px, qualidade 85%)
  - Validação: PNG ou JPG até 10MB
  - Preview instantâneo com `SafeImage`
- **API**: `/api/upload-photo` (proxy para backend)

#### Integração com Câmera
- **Biblioteca**: `navigator.mediaDevices.getUserMedia`
- **Uso**: Botão de câmera abre stream de vídeo para captura
- **Fallback**: Upload tradicional se câmera não disponível

#### Seleção de Produtos
- **Fonte**: Catálogo do lojista (`lojistas/{id}/produtos`)
- **Filtros**: Por categoria (Todos, Calçados, Joias, Roupas, etc.)
- **Limite**: Até 2 produtos de categorias diferentes
- **Estado**: Gerenciado localmente com `useState`
- **Priorização**: Produtos favoritos aparecem primeiro

#### Lógica de Filtros/Categorias
- **Extração**: Categorias únicas dos produtos do catálogo
- **Estado Ativo**: `activeCategory` controla filtro
- **Grid Responsivo**: 2 colunas (mobile) → 4 colunas (desktop)

### 3.2 Integração com Display (TV)

#### Conexão via QR Code
- **Geração**: `DisplayView.tsx` gera QR Code com URL:
  ```
  /[lojistaId]/experimentar?connect=true&lojista={id}&target_display={uuid}
  ```
- **Leitura**: `BarcodeDetector` API (navegador nativo)
- **Validação**: Verifica se QR Code pertence à loja correta
- **Armazenamento**: `sessionStorage` (temporário, por sessão)

#### DisplayView.tsx - Componente Principal
- **Modos de Operação**:
  - **Idle**: Exibe QR Code grande, mensagens motivacionais
  - **Active**: Exibe look gerado, informações do produto
- **Orientação**: Suporta `horizontal` e `vertical`
- **Real-time**: `onSnapshot` Firestore escuta `displays/{uuid}`
- **Timeout**: 120 segundos de inatividade → volta para idle

#### Lógica de Transmissão
- **Componente**: `SendToDisplayButton.tsx`
- **Condições**:
  - Cliente conectado (`connected_store_id` === `lojistaId`)
  - `target_display` presente no `sessionStorage`
  - Imagem válida disponível
- **Processo**:
  1. Pré-carregamento da imagem (cache)
  2. POST para `/api/display/update`
  3. Proxy para backend (paineladm)
  4. Backend atualiza Firestore `displays/{uuid}.activeImage`
  5. DisplayView detecta mudança e exibe

### 3.3 Gestão de Sessão e Segurança

#### Hook: `useStoreSession`
- **Responsabilidades**:
  - Gerenciar conexão com display
  - Detectar sessões concorrentes
  - Timeout de inatividade (30 minutos)
  - Atualizar última interação

#### Sessão Única (Concorrência)
- **Mecanismo**: `displays/{uuid}.activeSessionId` no Firestore
- **Monitoramento**: `onSnapshot` verifica mudanças
- **Ação**: Se outro cliente assumir, desconecta automaticamente

#### Timeout de Inatividade
- **Duração**: 30 minutos sem interação
- **Verificação**: Intervalo de 1 minuto
- **Armazenamento**: `localStorage.lastInteraction`
- **Eventos**: `click`, `keydown`, `touchstart`

### 3.4 Scanner de QR Code

#### Biblioteca
- **API Nativa**: `BarcodeDetector` (Chrome/Edge)
- **Fallback**: Mensagem de erro se não suportado

#### Processo
1. Usuário clica botão "Conectar Display"
2. Solicita permissão de câmera (`getUserMedia`)
3. Inicia stream de vídeo
4. `BarcodeDetector` detecta QR Code em tempo real
5. Parse da URL → extrai parâmetros
6. Validação → verifica `lojistaId` e `target_display`
7. Conexão → `useStoreSession.connect()`

---

## 4. Componentes Principais

### ExperimentarView.tsx
**Responsabilidade**: Tela principal de experimentação

**Props Principais**:
```typescript
interface ExperimentarViewProps {
  lojistaData: LojistaData | null
  isLoadingCatalog: boolean
  filteredCatalog: Produto[]
  categories: string[]
  activeCategory: string
  setActiveCategory: (category: string) => void
  userPhotoUrl: string | null
  isRefineMode: boolean
  handlePhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  selectedProducts: Produto[]
  toggleProductSelection: (produto: Produto) => void
  handleVisualize: () => void
  isGenerating: boolean
  isDisplayConnected: boolean
  onDisplayConnect: (storeId: string, targetDisplay?: string | null) => void
  // ... mais props
}
```

**Estados Principais**:
- `selectedProducts`: Produtos selecionados para look
- `userPhotoUrl`: URL da foto do usuário
- `isGenerating`: Estado de geração de look
- `scannerOpen`: Estado do scanner QR

### DisplayView.tsx
**Responsabilidade**: Exibição no display físico (TV)

**Props**:
```typescript
interface DisplayViewProps {
  lojistaData: LojistaData | null
}
```

**Estados Principais**:
- `viewMode`: "idle" | "active"
- `activeImage`: URL da imagem ativa
- `isLoadingNewImage`: Estado de carregamento
- `displayUuid`: UUID único do display
- `orientation`: "horizontal" | "vertical"

**Funcionalidades**:
- Geração de QR Code dinâmico
- Escuta real-time do Firestore
- Pré-carregamento de imagens (cache)
- Timeout automático (120s)

### SendToDisplayButton.tsx
**Responsabilidade**: Botão de transmissão para display

**Props**:
```typescript
interface SendToDisplayButtonProps {
  imageUrl: string
  lojistaId: string
  displayUuid?: string | null
  className?: string
  size?: "sm" | "md" | "lg"
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right"
}
```

**Lógica**:
- Verifica conexão antes de exibir
- Pré-carrega imagem antes de enviar
- Timeout de 15 segundos para requisição
- Feedback visual (loading, success)

### SafeImage.tsx
**Responsabilidade**: Componente de imagem com fallback

**Features**:
- Tratamento de erros de carregamento
- Placeholder enquanto carrega
- Suporte a `onClick` e `onError`
- Container customizável

---

## 5. Hooks Personalizados

### useStoreSession

**Localização**: `src/hooks/useStoreSession.ts`

**Propósito**: Gerenciar sessão de conexão com display da loja

**Retorno**:
```typescript
{
  isConnected: boolean
  connectedStoreId: string | null
  disconnect: () => void
  connect: (storeId: string, targetDisplay?: string) => void
  sessionId: string | null
  updateInteraction: () => void
}
```

**Funcionalidades**:
1. **Detecção de Conexão**: Lê `sessionStorage` e parâmetros URL
2. **Registro de Sessão**: Cria `sessionId` único e registra no Firestore
3. **Monitoramento de Concorrência**: Escuta `displays/{uuid}.activeSessionId`
4. **Timeout de Inatividade**: Desconecta após 30 minutos sem interação
5. **Atualização de Interação**: Marca última atividade em eventos globais

**Armazenamento**:
- `sessionStorage.connected_store_id`: ID da loja conectada
- `sessionStorage.target_display`: UUID do display
- `sessionStorage.display_session_id`: ID da sessão
- `localStorage.display_last_interaction`: Timestamp da última interação

---

## 6. Integração com API e Banco de Dados

### Endpoints de API (Next.js Routes)

#### Cliente
- `POST /api/cliente/login` - Autenticação com WhatsApp/Senha
- `POST /api/cliente/register` - Cadastro de novo cliente
- `GET /api/cliente/find` - Buscar cliente por WhatsApp
- `GET /api/cliente/favoritos` - Listar looks favoritos
- `GET /api/cliente/check-session` - Verificar sessão ativa

#### Display
- `POST /api/display/update` - Atualizar imagem no display (proxy para backend)

#### Lojista
- `GET /api/lojista/perfil` - Dados do perfil do lojista
- `GET /api/lojista/products` - Lista de produtos do catálogo

#### Ações
- `POST /api/actions` - Registrar like/dislike
- `GET /api/actions/check-vote` - Verificar status de voto

#### Upload e Geração
- `POST /api/upload-photo` - Upload de foto (proxy)
- `POST /api/generate-looks` - Gerar looks com IA (proxy)
- `POST /api/refine-tryon` - Adicionar acessório ao look (proxy)

### Estrutura do Firestore

#### Coleção: `lojistas`
```typescript
lojistas/{lojistaId}
  ├── nome: string
  ├── logoUrl: string | null
  ├── descricao: string | null
  ├── displayOrientation: "horizontal" | "vertical" | null
  ├── redesSociais: {
  │     instagram?: string
  │     facebook?: string
  │     tiktok?: string
  │   }
  ├── descontoRedesSociais: number | null
  └── produtos/ (subcollection)
      └── {produtoId}
          ├── nome: string
          ├── preco: number
          ├── categoria: string
          ├── imagemUrl: string
          └── ...
```

#### Coleção: `displays`
```typescript
displays/{displayUuid}
  ├── activeImage: string | null        # URL da imagem ativa
  ├── activeSessionId: string | null    # ID da sessão ativa
  ├── sessionClaimedAt: number | null  # Timestamp da sessão
  ├── updatedAt: Timestamp             # Última atualização
  └── lojistaId: string                 # ID do lojista
```

#### Coleção: `composicoes`
```typescript
composicoes/{compositionId}
  ├── imagemUrl: string
  ├── customerId: string
  ├── lojistaId: string
  ├── createdAt: Timestamp
  ├── curtido: boolean
  ├── isRemix: boolean
  ├── isRefined: boolean
  └── productImageUrls: string[]
```

---

## 7. Configuração e Variáveis de Ambiente

### Variáveis Obrigatórias

#### Firebase
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Propósito**: Configuração completa do Firebase (Firestore, Storage, Auth)

#### Backend URLs
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_PAINELADM_URL=http://localhost:3000
```

**Propósito**: URL do backend (paineladm) para APIs de proxy

#### App Cliente (Opcional)
```env
NEXT_PUBLIC_CLIENT_APP_URL=http://localhost:3005
NEXT_PUBLIC_CLIENT_APP_DEV_URL=http://localhost:3005
```

**Propósito**: URL do próprio app para compartilhamento e QR Codes

### Variáveis para Produção

Substituir `localhost` pelas URLs de produção:
```env
NEXT_PUBLIC_BACKEND_URL=https://paineladm.vercel.app
NEXT_PUBLIC_PAINELADM_URL=https://paineladm.vercel.app
NEXT_PUBLIC_CLIENT_APP_URL=https://app2.experimenteai.com.br
```

### Arquivo `.env.local`

Criar na raiz do projeto:
```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=projeto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Backend
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_PAINELADM_URL=http://localhost:3000

# App Cliente
NEXT_PUBLIC_CLIENT_APP_URL=http://localhost:3005
```

**⚠️ Importante**: Nunca commitar `.env.local` no Git (deve estar no `.gitignore`)

---

## 8. Build, Deploy e Scripts

### Scripts do package.json

```json
{
  "dev": "next dev -p 3005",           // Desenvolvimento local
  "build": "next build",               // Build de produção
  "start": "next start -p 3005",       // Servidor de produção
  "lint": "next lint"                  // Verificação de código
}
```

### Processo de Build

1. **Instalação de Dependências**:
   ```bash
   npm install
   ```

2. **Build de Produção**:
   ```bash
   npm run build
   ```
   - Compila TypeScript
   - Otimiza imagens (Next.js Image)
   - Minifica código (SWC)
   - Remove `console.log` (exceto `error` e `warn`)

3. **Verificação de Build**:
   ```bash
   # Windows
   .\scripts\verify-build.ps1
   
   # Linux/Mac
   ./scripts/verify-build.sh
   ```

### Deploy (Vercel)

#### Configuração
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

#### Variáveis de Ambiente no Vercel
1. Acessar: Settings → Environment Variables
2. Adicionar todas as variáveis `NEXT_PUBLIC_*`
3. Marcar para: Production, Preview, Development
4. Fazer novo deploy após adicionar

#### Configurações Específicas

**next.config.mjs**:
- `swcMinify: true` - Minificação com SWC
- `compress: true` - Compressão gzip
- `removeConsole` - Remove console.log em produção
- `images.remotePatterns` - Domínios permitidos para imagens
- `images.formats` - Suporta AVIF e WebP

**vercel.json** (se existir):
- Configurações de rewrites/redirects
- Headers customizados
- Configurações de domínio

---

## 9. Considerações de UI/UX e Estilo

### Solução de Estilização

**Tailwind CSS 3.4.13** - Framework utility-first

**Configuração** (`tailwind.config.ts`):
```typescript
{
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#d8dce8",
        "accent-1": "#6f5cf1",  // Roxo
        "accent-2": "#3cd2c9",  // Turquesa
        "accent-3": "#ff7c9c",  // Rosa
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
}
```

### Padrões de Design

#### Glassmorphism (Display)
- **Aplicação**: `DisplayView.tsx` (modo vertical)
- **Classes**: `bg-white/10 backdrop-blur-lg border border-white/20 shadow-xl`
- **Uso**: Cards translúcidos com efeito de vidro fosco

#### Responsividade Mobile-First
- **Breakpoints Tailwind**:
  - `sm:` ≥ 640px (tablets)
  - `md:` ≥ 768px (tablets grandes)
  - `lg:` ≥ 1024px (desktop)
- **Grid de Produtos**: 2 colunas (mobile) → 4 colunas (desktop)
- **Padding Adaptativo**: `p-3` (mobile) → `p-6` (desktop)

#### Tipografia Hierárquica
- **Títulos Grandes**: `text-4xl` a `text-6xl` com `font-black`
- **Subtítulos**: `text-lg` a `text-xl` com `font-semibold`
- **Corpo**: `text-sm` a `text-base` com `font-normal`

#### Cores e Temas

**Gradientes de Fundo**:
- **Display Idle**: `linear-gradient(160deg, #312e81 0%, #5a23c8 45%, #9333ea 100%)`
- **Display Active**: `linear-gradient(150deg, #161837 0%, #31186f 50%, #6a21bf 100%)`
- **App Cliente**: Gradientes roxo/azul com animações

**Cores de Destaque**:
- **Dourado/Amarelo**: `text-yellow-300`, `text-yellow-400` (marca)
- **Branco**: Textos principais (`text-white`)
- **Roxo**: Elementos interativos (`bg-purple-600`)

### Componentes UI Reutilizáveis

#### Button.tsx
- Variantes: `primary`, `secondary`, `outline`
- Tamanhos: `sm`, `md`, `lg`
- Estados: `loading`, `disabled`

#### SafeImage.tsx
- Fallback automático em erro
- Placeholder durante carregamento
- Suporte a `onClick` e `onError`

#### Input.tsx
- Estilização consistente com Tailwind Forms
- Suporte a validação visual

---

## 10. Fluxos de Dados Detalhados

### Fluxo Completo: Upload → Look → Display

```
1. Cliente acessa /[lojistaId]/experimentar
   ↓
2. Upload de foto → Compressão (se > 1MB)
   ↓
3. POST /api/upload-photo → Backend → Firebase Storage
   ↓
4. Seleção de produtos (até 2, categorias diferentes)
   ↓
5. POST /api/generate-looks → Backend → IA (Gemini)
   ↓
6. Look gerado → Navegação para /[lojistaId]/resultado
   ↓
7. Cliente vota (like/dislike) → POST /api/actions
   ↓
8. Scanner QR Code → Conexão com display
   ↓
9. Botão "Transmitir" aparece → SendToDisplayButton
   ↓
10. POST /api/display/update → Backend → Firestore
    ↓
11. DisplayView detecta mudança → Exibe look no display físico
```

### Fluxo de Sessão e Concorrência

```
1. Cliente escaneia QR Code
   ↓
2. useStoreSession detecta parâmetros URL
   ↓
3. Cria sessionId único → sessionStorage
   ↓
4. Registra no Firestore: displays/{uuid}.activeSessionId
   ↓
5. Monitora mudanças com onSnapshot
   ↓
6. Se outro cliente assumir → Desconecta automaticamente
   ↓
7. Timeout de 30min sem interação → Desconecta
```

---

## 11. Segurança e Boas Práticas

### Validação de Entrada
- Upload de imagens: Validação de tipo e tamanho
- Parâmetros URL: Validação de `lojistaId` e `target_display`
- Autenticação: Verificação de senha no backend

### Armazenamento
- **sessionStorage**: Dados temporários (conexão, display)
- **localStorage**: Dados persistentes (última interação)
- **Firestore**: Dados do servidor (looks, sessões)

### CORS e Permissões
- APIs fazem proxy para backend (evita CORS)
- Firebase configurado com regras de segurança
- Permissões de câmera solicitadas apenas quando necessário

### Tratamento de Erros
- Try/catch em todas as operações assíncronas
- Mensagens de erro amigáveis ao usuário
- Logs detalhados no console (desenvolvimento)

---

## 12. Performance e Otimizações

### Imagens
- **Compressão Automática**: Imagens > 1MB são redimensionadas
- **Formato Moderno**: Suporte a AVIF e WebP
- **Lazy Loading**: Imagens carregam sob demanda
- **Cache**: Imagens pré-carregadas em `imageCache`

### Código
- **SWC Minify**: Minificação rápida com SWC
- **Tree Shaking**: Remoção de código não utilizado
- **Code Splitting**: Divisão automática por rotas (Next.js)

### Firebase
- **Queries Otimizadas**: Limites e índices apropriados
- **Cache Local**: Dados do lojista em cache
- **Real-time Eficiente**: `onSnapshot` apenas quando necessário

---

## 13. Testes e QA

### Checklist Manual
- [ ] Upload de foto funciona
- [ ] Seleção de produtos funciona
- [ ] Geração de look completa
- [ ] Scanner QR Code conecta
- [ ] Transmissão para display funciona
- [ ] Timeout de inatividade funciona
- [ ] Sessão concorrente detecta corretamente
- [ ] Layout responsivo em mobile/desktop
- [ ] Display mostra imagens corretamente

### Scripts de Verificação
- `scripts/verify-build.ps1` (Windows)
- `scripts/verify-build.sh` (Linux/Mac)

---

## 14. Troubleshooting Comum

### Problema: Firebase não configurado
**Solução**: Verificar variáveis de ambiente `NEXT_PUBLIC_FIREBASE_*`

### Problema: Erro 413 (Payload Too Large)
**Solução**: Compressão automática já implementada, verificar se está funcionando

### Problema: Display não atualiza
**Solução**: 
- Verificar se `displayUuid` está correto
- Verificar se backend está acessível
- Verificar logs do console

### Problema: Scanner QR Code não funciona
**Solução**: 
- Verificar se navegador suporta `BarcodeDetector`
- Verificar permissões de câmera
- Usar fallback de upload manual

---

## 15. Referências e Documentação Adicional

### Documentos no Repositório
- `docs/VARIAVEIS_AMBIENTE.md` - Variáveis de ambiente
- `docs/IMPLEMENTACAO_DISPLAY_COMPLETA.md` - Implementação do display
- `docs/FAVORITOS_LIKE_DISLIKE.md` - Sistema de favoritos
- `docs/QA_MANUAL.md` - Checklist de QA

### Links Externos
- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vercel Deployment](https://vercel.com/docs)

---

**Última Atualização**: Dezembro 2024  
**Versão do Documento**: 1.0  
**Mantido por**: Equipe de Desenvolvimento ExperimenteAI

"Great. Now proceed to 03_PHASE_3_CLIENT_APP_UX.md. Implement the Store Context provider and the Privacy Onboarding Modal."



fase 3

"When implementing the Privacy Modal and Avatar Selector, please ensure you DO NOT break or remove the existing QR Code/Display Logic (useStoreSession). The new features should live alongside the existing ones."

fase 5

I have updated '05_PHASE_5_EXPANSION.md' to use **Mercado Pago** instead of Stripe.

**Phase 5 Execution Instructions:**

1.  **Data Schema:** Update `SalesConfig` in `src/lib/types.ts` to include `mercadopago_public_key` and `mercadopago_access_token`.
2.  **Admin UI:** Create `SalesSettingsForm` allowing the retailer to input their Mercado Pago credentials.
3.  **Backend Logic:**
    * Create the Shipping Calculator route (Melhor Envio).
    * Create the Payment Route: `/api/sales/create-payment`. It should use the 'mercadopago' Node.js SDK to generate a Payment Preference or Pix Code based on the retailer's Access Token.

Confirm when you are ready to implement the Mercado Pago integration.
