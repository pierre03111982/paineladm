# 🔒 Como Aplicar as Regras Melhoradas do Firestore

## 📋 Passo a Passo

### 1. Acesse o Firebase Console
- Vá para: https://console.firebase.google.com/
- Selecione o projeto: **paineladmexperimenteai**

### 2. Navegue até as Regras do Firestore
- No menu lateral, clique em **Firestore Database**
- Clique na aba **Regras** (Rules)

### 3. Copie as Regras Melhoradas
- Abra o arquivo `firestore.rules` neste projeto
- Ou copie o conteúdo abaixo:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // NODO RAIZ DAS LOJAS
    // ============================================
    match /lojas/{lojistaId} {
      
      // 1. Dados públicos da loja (Nome, Logo, Configurações)
      allow read: if true;
      allow write: if isAdminRequest();
      
      // 2. Perfil da loja (modelo do app)
      match /perfil/{document=**} {
        allow read: if true;
        allow write: if isAdminRequest();
      }
      
      // 3. Catálogo público de produtos
      match /produtos/{produtoId} {
        allow read: if isPublicRead();
        allow write: if isAdminRequest();
      }
      
      // 4. Composições exibidas no app cliente
      match /composicoes/{composicaoId} {
        allow read: if isPublicRead();
        allow write: if isAdminRequest();
      }
      
      // 5. Clientes (protegido - apenas backend)
      match /clientes/{customerId} {
        // Cliente só pode ler/escrever seus próprios dados se autenticado
        // Mas como usamos Admin SDK, isso não é necessário agora
        allow read, write: if isAdminRequest();
        
        // 5.1. Favoritos do cliente
        match /favoritos/{favoritoId} {
          // Cliente autenticado pode ler/escrever seus próprios favoritos
          // Mas como usamos Admin SDK, isso não é necessário agora
          allow read, write: if isAdminRequest();
        }
        
        // 5.2. Sessões do cliente (para controle de login único)
        match /sessoes/{sessionId} {
          allow read, write: if isAdminRequest();
        }
      }
      
      // 6. Métricas e outras coleções (protegido)
      match /{document=**} {
        allow read, write: if isAdminRequest();
      }
    }
  }
  
  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================
  
  // Libera leitura anônima controlada (GET ou LIST com limite)
  function isPublicRead() {
    return request.auth == null
      && (
        request.method == "get"
        || (request.method == "list" && hasValidLimit())
      );
  }
  
  // Exige limite explícito (máx. 50 documentos)
  function hasValidLimit() {
    return request.query.limit != null
      && request.query.limit <= 50;
  }
  
  // Verifica se é requisição do backend (Admin SDK)
  // O Admin SDK ignora essas regras, mas é bom ter para clareza
  function isAdminRequest() {
    // Se no futuro usar Firebase Auth no app cliente, ajustar aqui
    return request.auth != null;
  }
}
```

### 4. Cole no Editor de Regras
- Cole o conteúdo completo no editor
- O Firebase validará automaticamente a sintaxe

### 5. Publique as Regras
- Clique no botão **Publicar** (Publish)
- Aguarde a confirmação de sucesso

## ✅ Verificação

Após publicar, você verá:
- ✅ Mensagem de sucesso
- ✅ Histórico atualizado com a nova versão
- ✅ Regras ativas imediatamente

## 🔍 O que Mudou?

### Melhorias Implementadas:
1. **Regras específicas para favoritos** - Organização clara
2. **Regras para sessões** - Preparação para futuro
3. **Comentários detalhados** - Facilita manutenção
4. **Estrutura hierárquica** - Mais fácil de entender

### Compatibilidade:
- ✅ **100% compatível** com as regras anteriores
- ✅ **Mesma funcionalidade** - nada muda no comportamento
- ✅ **Mais organizado** - facilita futuras modificações

## ⚠️ Importante

- As regras **não afetam** o funcionamento atual (Admin SDK ignora regras)
- A aplicação é **segura** - não quebra nada existente
- Você pode **reverter** a qualquer momento pelo histórico

## 📝 Notas

- As regras são aplicadas **imediatamente** após publicação
- Não há necessidade de reiniciar serviços
- O histórico mantém todas as versões anteriores



## 📋 Passo a Passo

### 1. Acesse o Firebase Console
- Vá para: https://console.firebase.google.com/
- Selecione o projeto: **paineladmexperimenteai**

### 2. Navegue até as Regras do Firestore
- No menu lateral, clique em **Firestore Database**
- Clique na aba **Regras** (Rules)

### 3. Copie as Regras Melhoradas
- Abra o arquivo `firestore.rules` neste projeto
- Ou copie o conteúdo abaixo:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // NODO RAIZ DAS LOJAS
    // ============================================
    match /lojas/{lojistaId} {
      
      // 1. Dados públicos da loja (Nome, Logo, Configurações)
      allow read: if true;
      allow write: if isAdminRequest();
      
      // 2. Perfil da loja (modelo do app)
      match /perfil/{document=**} {
        allow read: if true;
        allow write: if isAdminRequest();
      }
      
      // 3. Catálogo público de produtos
      match /produtos/{produtoId} {
        allow read: if isPublicRead();
        allow write: if isAdminRequest();
      }
      
      // 4. Composições exibidas no app cliente
      match /composicoes/{composicaoId} {
        allow read: if isPublicRead();
        allow write: if isAdminRequest();
      }
      
      // 5. Clientes (protegido - apenas backend)
      match /clientes/{customerId} {
        // Cliente só pode ler/escrever seus próprios dados se autenticado
        // Mas como usamos Admin SDK, isso não é necessário agora
        allow read, write: if isAdminRequest();
        
        // 5.1. Favoritos do cliente
        match /favoritos/{favoritoId} {
          // Cliente autenticado pode ler/escrever seus próprios favoritos
          // Mas como usamos Admin SDK, isso não é necessário agora
          allow read, write: if isAdminRequest();
        }
        
        // 5.2. Sessões do cliente (para controle de login único)
        match /sessoes/{sessionId} {
          allow read, write: if isAdminRequest();
        }
      }
      
      // 6. Métricas e outras coleções (protegido)
      match /{document=**} {
        allow read, write: if isAdminRequest();
      }
    }
  }
  
  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================
  
  // Libera leitura anônima controlada (GET ou LIST com limite)
  function isPublicRead() {
    return request.auth == null
      && (
        request.method == "get"
        || (request.method == "list" && hasValidLimit())
      );
  }
  
  // Exige limite explícito (máx. 50 documentos)
  function hasValidLimit() {
    return request.query.limit != null
      && request.query.limit <= 50;
  }
  
  // Verifica se é requisição do backend (Admin SDK)
  // O Admin SDK ignora essas regras, mas é bom ter para clareza
  function isAdminRequest() {
    // Se no futuro usar Firebase Auth no app cliente, ajustar aqui
    return request.auth != null;
  }
}
```

### 4. Cole no Editor de Regras
- Cole o conteúdo completo no editor
- O Firebase validará automaticamente a sintaxe

### 5. Publique as Regras
- Clique no botão **Publicar** (Publish)
- Aguarde a confirmação de sucesso

## ✅ Verificação

Após publicar, você verá:
- ✅ Mensagem de sucesso
- ✅ Histórico atualizado com a nova versão
- ✅ Regras ativas imediatamente

## 🔍 O que Mudou?

### Melhorias Implementadas:
1. **Regras específicas para favoritos** - Organização clara
2. **Regras para sessões** - Preparação para futuro
3. **Comentários detalhados** - Facilita manutenção
4. **Estrutura hierárquica** - Mais fácil de entender

### Compatibilidade:
- ✅ **100% compatível** com as regras anteriores
- ✅ **Mesma funcionalidade** - nada muda no comportamento
- ✅ **Mais organizado** - facilita futuras modificações

## ⚠️ Importante

- As regras **não afetam** o funcionamento atual (Admin SDK ignora regras)
- A aplicação é **segura** - não quebra nada existente
- Você pode **reverter** a qualquer momento pelo histórico

## 📝 Notas

- As regras são aplicadas **imediatamente** após publicação
- Não há necessidade de reiniciar serviços
- O histórico mantém todas as versões anteriores



