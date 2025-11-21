# 📸 Guia Visual: Importar Modelos 1, 2 e 3 no Vercel

## 🎯 O que fazer na tela que você está vendo

Na tela do Vercel "New Project" que você está vendo, você precisa criar **3 projetos separados**, um para cada modelo.

---

## 📋 Passo a Passo Detalhado

### ⚠️ IMPORTANTE: Você vai fazer isso 3 vezes!

Você precisa importar o mesmo repositório 3 vezes, mas configurando o **Root Directory** diferente para cada um.

---

## 🔵 PRIMEIRA VEZ: Modelo 1

### 1. Na tela do Vercel "New Project":

1. **Na seção "Import Git Repository" (lado esquerdo):**
   - Procure e selecione o repositório que contém os modelos
   - Pode ser: `apps-cliente-modelo1`, `apps-cliente-modelo2`, `apps-cliente-modelo3` (se estiverem separados)
   - **OU** o repositório principal se todos os modelos estão juntos

2. **Clique em "Import"** ao lado do repositório

### 2. Na tela de configuração do projeto:

1. **Project Name:**
   ```
   apps-cliente-modelo1
   ```

2. **Framework Preset:**
   - Deve detectar automaticamente como "Next.js"
   - Se não detectar, selecione manualmente "Next.js"

3. **Root Directory:** ⚠️ **MUITO IMPORTANTE!**
   - Clique em "Edit" ao lado de "Root Directory"
   - Digite exatamente:
   ```
   apps-cliente/modelo-1
   ```
   - Isso diz ao Vercel qual pasta usar dentro do repositório

4. **Build Command:**
   - Deixe o padrão ou: `npm run build`

5. **Output Directory:**
   - Deixe o padrão: `.next`

6. **Install Command:**
   - Deixe o padrão: `npm install`

7. **Environment Variables:**
   - Por enquanto, deixe vazio
   - Vamos configurar depois

8. **Clique em "Deploy"**

9. **Aguarde o deploy terminar** (pode levar alguns minutos)

---

## 🟢 SEGUNDA VEZ: Modelo 2

### Repita todo o processo acima, mas com estas diferenças:

1. **Volte para a tela "New Project"** (https://vercel.com/new)

2. **Importe o MESMO repositório novamente**

3. **Na configuração:**
   - **Project Name:** `apps-cliente-modelo2`
   - **Root Directory:** `apps-cliente/modelo-2` ⚠️ **DIFERENTE!**

4. **Clique em "Deploy"**

---

## 🟡 TERCEIRA VEZ: Modelo 3

### Repita novamente:

1. **Volte para a tela "New Project"** (https://vercel.com/new)

2. **Importe o MESMO repositório novamente**

3. **Na configuração:**
   - **Project Name:** `apps-cliente-modelo3`
   - **Root Directory:** `apps-cliente/modelo-3` ⚠️ **DIFERENTE!**

4. **Clique em "Deploy"**

---

## 📊 Resumo Visual

```
┌─────────────────────────────────────┐
│  Vercel New Project                 │
├─────────────────────────────────────┤
│                                     │
│  Import Git Repository              │
│  ┌─────────────────────────────┐   │
│  │ [Seu Repositório]            │   │
│  │ [Import] ← Clique aqui       │   │
│  └─────────────────────────────┘   │
│                                     │
│  Depois configure:                  │
│  • Project Name: apps-cliente-     │
│    modelo1 (ou 2, ou 3)            │
│  • Root Directory: apps-cliente/   │
│    modelo-1 (ou 2, ou 3) ⚠️       │
│                                     │
└─────────────────────────────────────┘
```

---

## ❓ Perguntas Frequentes

### "Os modelos estão em repositórios separados?"

Se você vê na tela:
- `apps-cliente-modelo1`
- `apps-cliente-modelo2`
- `apps-cliente-modelo3`

**Então:**
- Importe cada um separadamente
- **NÃO precisa** configurar Root Directory (deixe vazio)
- Cada repositório já é um projeto completo

### "Os modelos estão no mesmo repositório?"

Se você vê apenas um repositório (ex: `apps-cliente` ou o nome do seu projeto principal):

**Então:**
- Importe o mesmo repositório **3 vezes**
- Configure o **Root Directory** diferente em cada projeto:
  - Projeto 1: `apps-cliente/modelo-1`
  - Projeto 2: `apps-cliente/modelo-2`
  - Projeto 3: `apps-cliente/modelo-3`

---

## ✅ Como saber qual é o seu caso?

Olhe na estrutura de pastas do seu projeto:

```
E:\projetos\apps-cliente\
  ├── modelo-1\    ← Se você tem isso
  ├── modelo-2\    ← Se você tem isso
  └── modelo-3\    ← Se você tem isso
```

**Então você tem os 3 modelos no mesmo repositório!**

Nesse caso, você precisa:
1. Importar o repositório 3 vezes
2. Configurar Root Directory diferente em cada um

---

## 🎯 Próximos Passos

Depois de criar os 3 projetos:

1. ✅ Configure os subdomínios (Passo 3 do guia principal)
2. ✅ Configure o DNS (Passo 4 do guia principal)
3. ✅ Configure as variáveis de ambiente (Passo 6 do guia principal)

---

## 🆘 Precisa de ajuda?

Se tiver dúvidas sobre:
- Qual repositório importar
- Como configurar o Root Directory
- Se os modelos estão no lugar certo

Me avise que eu te ajudo! 😊

