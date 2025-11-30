# 📱 Guia: Como Fazer a Logo Aparecer ao Compartilhar o Link

## ✅ O que já está configurado

O sistema já está configurado para usar a logo da sua loja quando você compartilha o link do app. A logo aparece automaticamente em:
- **WhatsApp** (preview do link)
- **Facebook** (quando compartilha)
- **Instagram** (stories/posts)
- **Twitter/X** (quando compartilha)
- **Outros apps** que suportam Open Graph

## 🔧 Como garantir que funcione

### 1. **Verificar se a Logo está Cadastrada**

1. Acesse o **Painel do Lojista**
2. Vá em **Configurações**
3. Verifique se há uma logo cadastrada na seção **"Logo da Loja"**
4. Se não houver, faça o upload de uma logo

### 2. **Requisitos da Logo**

Para a melhor qualidade no preview:
- **Formato:** PNG ou JPG
- **Tamanho recomendado:** Mínimo 200x200px (quadrada é melhor)
- **Fundo:** Transparente (PNG) ou fundo sólido
- **Qualidade:** Alta resolução (não pixelada)

### 3. **Verificar se a Logo é Acessível**

A logo precisa estar em uma URL pública (acessível na internet). O sistema salva automaticamente no Firebase Storage, então isso já está configurado.

### 4. **Testar o Preview**

#### **Opção 1: WhatsApp**
1. Abra o WhatsApp
2. Envie o link do seu app para você mesmo ou para um grupo de teste
3. Verifique se a logo aparece no preview

#### **Opção 2: Ferramentas Online**
Use estas ferramentas para testar:
- **Facebook Sharing Debugger:** https://developers.facebook.com/tools/debug/
- **Twitter Card Validator:** https://cards-dev.twitter.com/validator
- **LinkedIn Post Inspector:** https://www.linkedin.com/post-inspector/

Cole o link do seu app (ex: `https://app2.experimenteai.com.br/h`) e clique em "Debug" ou "Preview".

## 🎨 O que aparece no Preview

Quando você compartilha o link, aparece:
- **Imagem:** Logo da sua loja (ou imagem gerada automaticamente)
- **Título:** "[Nome da Loja] | Provador Virtual com IA"
- **Descrição:** "Experimente as roupas da [Nome da Loja] sem sair de casa. Tecnologia de Provador Virtual Inteligente."

## 🔄 Se a Logo não Aparecer

### **Problema 1: Logo não cadastrada**
**Solução:** Faça o upload da logo nas Configurações do Painel

### **Problema 2: Cache do WhatsApp/Facebook**
**Solução:** 
1. Use a ferramenta **Facebook Sharing Debugger** (link acima)
2. Cole o link do seu app
3. Clique em **"Scrape Again"** para forçar atualização do cache

### **Problema 3: Logo muito pequena ou de baixa qualidade**
**Solução:** 
1. Use uma logo de alta resolução (mínimo 200x200px)
2. Faça upload novamente nas Configurações

### **Problema 4: URL não acessível**
**Solução:** 
1. Verifique se a logo foi salva corretamente no Firebase Storage
2. Tente acessar a URL da logo diretamente no navegador
3. Se não abrir, faça upload novamente

## 📝 Exemplo de Link para Compartilhar

```
https://app2.experimenteai.com.br/h
```

Substitua `h` pelo ID da sua loja (o mesmo que aparece na URL do painel).

## 🚀 Dica Pro

Para melhorar ainda mais o preview:
1. Use uma logo com fundo transparente (PNG)
2. Garanta que a logo seja legível mesmo em tamanho pequeno
3. Evite logos muito detalhadas (simples funciona melhor)
4. Teste sempre após fazer upload de uma nova logo

## ❓ Precisa de Ajuda?

Se mesmo após seguir este guia a logo não aparecer:
1. Verifique se a logo está salva corretamente no Firestore
2. Teste a URL da logo diretamente no navegador
3. Use as ferramentas de debug mencionadas acima
4. Entre em contato com o suporte técnico

---

**Última atualização:** Dezembro 2024


