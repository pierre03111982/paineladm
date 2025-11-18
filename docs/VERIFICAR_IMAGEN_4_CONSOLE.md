# Guia: Verificar Imagen 4.0 no Google Cloud Console

## Passo a Passo para Verificar no Console

### 1. Acessar o Vertex AI Model Garden

1. Acesse: https://console.cloud.google.com/
2. Selecione o projeto: `paineladmexperimenteai`
3. No menu lateral, vá em **Vertex AI** > **Model Garden**
4. Ou acesse diretamente: https://console.cloud.google.com/vertex-ai/model-garden

### 2. Buscar por Imagen

1. Na barra de busca do Model Garden, digite: **"Imagen"**
2. Procure por modelos:
   - `imagen-3.0-capability-001` (já conhecemos)
   - `imagen-4.0-*` ou `imagen-4-*` (verificar se existe)
   - Qualquer versão mais recente

### 3. Verificar Capacidades de Cada Modelo

Para cada modelo encontrado:

1. Clique no modelo para ver detalhes
2. Verifique a seção **"Capabilities"** ou **"Features"**
3. Procure por:
   - ✅ "Multiple reference images"
   - ✅ "Image composition"
   - ✅ "Image-to-image with multiple inputs"
   - ✅ "Reference image support"
4. Leia a documentação do modelo (link "View documentation")

### 4. Verificar Endpoints Disponíveis

1. No Model Garden, clique em **"View API"** ou **"Use API"**
2. Verifique o endpoint do modelo
3. Procure na documentação por:
   - Parâmetros aceitos
   - Se aceita múltiplas imagens
   - Exemplos de uso

### 5. Verificar via API (Opcional)

Use o script abaixo para verificar programaticamente.

---

## Script de Verificação via API

Execute este script para listar todos os modelos Imagen disponíveis:

```bash
# Usando gcloud CLI
gcloud ai models list --region=us-central1 --filter="displayName:imagen*"

# Ou verificar diretamente no Model Garden API
curl -X GET \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/paineladmexperimenteai/locations/us-central1/publishers/google/models" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

---

## O Que Procurar Especificamente

### ✅ Sinais de que suporta múltiplas imagens:
- Documentação menciona "reference images" (plural)
- Exemplos mostram múltiplas imagens de entrada
- Parâmetros da API aceitam array de imagens
- Menciona "image composition" ou "multi-image input"

### ❌ Sinais de que NÃO suporta:
- Apenas menciona "image" (singular)
- Exemplos mostram apenas 1 imagem base
- Documentação fala apenas de "text-to-image" ou "image-to-image" (singular)

---

## Checklist de Verificação

- [ ] Acessei o Vertex AI Model Garden
- [ ] Busquei por "Imagen"
- [ ] Verifiquei se existe Imagen 4.0 ou versão mais recente
- [ ] Li a documentação do modelo
- [ ] Verifiquei as capacidades listadas
- [ ] Verifiquei exemplos de uso
- [ ] Verifiquei parâmetros da API
- [ ] Anotei o nome exato do modelo (se encontrado)
- [ ] Anotei o endpoint (se encontrado)

---

## Resultado Esperado

Após verificar, você terá:
1. ✅ Confirmação se Imagen 4.0 existe
2. ✅ Nome exato do modelo (ex: `imagen-4.0-capability-001`)
3. ✅ Endpoint da API
4. ✅ Se suporta múltiplas imagens ou não
5. ✅ Documentação oficial

---

## Próximos Passos Após Verificação

### Se Imagen 4.0 existir e suportar múltiplas imagens:
1. Atualizar código para usar Imagen 4.0
2. Modificar endpoint e parâmetros
3. Testar composição pessoa + óculos

### Se não existir ou não suportar:
1. Continuar com Imagen 3.0 + prompt detalhado
2. Considerar APIs de terceiros
3. Aguardar futuras atualizações

---

## Links Úteis

- **Vertex AI Model Garden**: https://console.cloud.google.com/vertex-ai/model-garden
- **Documentação Vertex AI**: https://cloud.google.com/vertex-ai/docs
- **Imagen 3.0 (atual)**: https://console.cloud.google.com/vertex-ai/publishers/google/model-garden/imagen-3.0-capability-001



## Passo a Passo para Verificar no Console

### 1. Acessar o Vertex AI Model Garden

1. Acesse: https://console.cloud.google.com/
2. Selecione o projeto: `paineladmexperimenteai`
3. No menu lateral, vá em **Vertex AI** > **Model Garden**
4. Ou acesse diretamente: https://console.cloud.google.com/vertex-ai/model-garden

### 2. Buscar por Imagen

1. Na barra de busca do Model Garden, digite: **"Imagen"**
2. Procure por modelos:
   - `imagen-3.0-capability-001` (já conhecemos)
   - `imagen-4.0-*` ou `imagen-4-*` (verificar se existe)
   - Qualquer versão mais recente

### 3. Verificar Capacidades de Cada Modelo

Para cada modelo encontrado:

1. Clique no modelo para ver detalhes
2. Verifique a seção **"Capabilities"** ou **"Features"**
3. Procure por:
   - ✅ "Multiple reference images"
   - ✅ "Image composition"
   - ✅ "Image-to-image with multiple inputs"
   - ✅ "Reference image support"
4. Leia a documentação do modelo (link "View documentation")

### 4. Verificar Endpoints Disponíveis

1. No Model Garden, clique em **"View API"** ou **"Use API"**
2. Verifique o endpoint do modelo
3. Procure na documentação por:
   - Parâmetros aceitos
   - Se aceita múltiplas imagens
   - Exemplos de uso

### 5. Verificar via API (Opcional)

Use o script abaixo para verificar programaticamente.

---

## Script de Verificação via API

Execute este script para listar todos os modelos Imagen disponíveis:

```bash
# Usando gcloud CLI
gcloud ai models list --region=us-central1 --filter="displayName:imagen*"

# Ou verificar diretamente no Model Garden API
curl -X GET \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/paineladmexperimenteai/locations/us-central1/publishers/google/models" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

---

## O Que Procurar Especificamente

### ✅ Sinais de que suporta múltiplas imagens:
- Documentação menciona "reference images" (plural)
- Exemplos mostram múltiplas imagens de entrada
- Parâmetros da API aceitam array de imagens
- Menciona "image composition" ou "multi-image input"

### ❌ Sinais de que NÃO suporta:
- Apenas menciona "image" (singular)
- Exemplos mostram apenas 1 imagem base
- Documentação fala apenas de "text-to-image" ou "image-to-image" (singular)

---

## Checklist de Verificação

- [ ] Acessei o Vertex AI Model Garden
- [ ] Busquei por "Imagen"
- [ ] Verifiquei se existe Imagen 4.0 ou versão mais recente
- [ ] Li a documentação do modelo
- [ ] Verifiquei as capacidades listadas
- [ ] Verifiquei exemplos de uso
- [ ] Verifiquei parâmetros da API
- [ ] Anotei o nome exato do modelo (se encontrado)
- [ ] Anotei o endpoint (se encontrado)

---

## Resultado Esperado

Após verificar, você terá:
1. ✅ Confirmação se Imagen 4.0 existe
2. ✅ Nome exato do modelo (ex: `imagen-4.0-capability-001`)
3. ✅ Endpoint da API
4. ✅ Se suporta múltiplas imagens ou não
5. ✅ Documentação oficial

---

## Próximos Passos Após Verificação

### Se Imagen 4.0 existir e suportar múltiplas imagens:
1. Atualizar código para usar Imagen 4.0
2. Modificar endpoint e parâmetros
3. Testar composição pessoa + óculos

### Se não existir ou não suportar:
1. Continuar com Imagen 3.0 + prompt detalhado
2. Considerar APIs de terceiros
3. Aguardar futuras atualizações

---

## Links Úteis

- **Vertex AI Model Garden**: https://console.cloud.google.com/vertex-ai/model-garden
- **Documentação Vertex AI**: https://cloud.google.com/vertex-ai/docs
- **Imagen 3.0 (atual)**: https://console.cloud.google.com/vertex-ai/publishers/google/model-garden/imagen-3.0-capability-001

