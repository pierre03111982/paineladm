# PROJETO: VTO Híbrido (Gemini 3 "Director" + Imagen 3 "Photographer")

## 1. Objetivo do Projeto
Criar um script (Python ou Node.js) para um sistema de "Virtual Try-On" de produtos (óculos, relógios, roupas) que priorize a **integração atmosférica realista**.
O sistema deve fugir da "colagem rígida" e permitir que a IA ajuste a iluminação, sombras e reflexos (blending) para que o produto pareça pertencer à foto original.

## 2. Arquitetura Técnica (O Fluxo de 2 Passos)
O sistema não deve usar um único prompt. Ele deve operar em dois estágios distintos:

### Estágio A: O "Diretor Criativo" (Modelo: Gemini 1.5 Pro / Gemini 3 Experimental)
* **Input:** Imagem da Pessoa (Base64) + Imagem do Produto (Base64).
* **Função:** Não gera a imagem final. Ele analisa a cena e o produto para gerar metadados JSON.
* **Output Esperado (JSON):**
    1.  `creative_prompt`: Um prompt em inglês altamente descritivo para o Imagen 3, focando em iluminação, ambiente e estilo.
    2.  `edit_area_coordinates`: Bounding box [ymin, xmin, ymax, xmax] aproximado de onde o produto deve entrar.

### Estágio B: O "Fotógrafo" (Modelo: Vertex AI Imagen 3 - Image Editing)
* **Input:** Imagem da Pessoa + Máscara (gerada via código a partir das coordenadas) + `creative_prompt`.
* **Função:** Usa o endpoint de edição (inpainting/insert object) para gerar a imagem final.

---

## 3. Implementação Detalhada (Instruções para o Código)

### Passo 1: Configuração do "Diretor Criativo" (Gemini)
Ao chamar a API do Gemini, utilize este **System Instruction** específico para garantir a autonomia criativa:

"""
SYS_PROMPT_DIRECTOR:
Você é um Diretor de Fotografia de Moda especialista em 'Prompt Engineering' para o Imagen 3.
Sua tarefa é analisar a imagem do usuário e do produto e criar um prompt de geração que funda os dois perfeitamente.

REGRAS DE CRIATIVIDADE (Autonomia de Iluminação):
1. Analise a luz da imagem original. No prompt, descreva como essa luz deve interagir com o produto (ex: "soft shadows on skin", "specular highlights on the watch bezel").
2. Se o produto sugerir um contexto (ex: óculos escuros), você tem AUTONOMIA para alterar sutilmente o background no prompt (ex: sugerir "sunlight", "outdoor cafe background").
3. Use palavras-chave de harmonização: "Global illumination", "Volumetric lighting", "Photorealistic blending".

Saída estrita em JSON:
{
  "creative_prompt": "O prompt em inglês para o Imagen 3...",
  "bbox_ymin": 0.0,
  "bbox_xmin": 0.0,
  "bbox_ymax": 0.0,
  "bbox_xmax": 0.0
}
"""

### Passo 2: Lógica de "Máscara Dilatada" (Crítico para o Blending)
Não use as coordenadas exatas do Gemini diretamente. O código deve aplicar uma **DILATAÇÃO (Padding)** de 15% a 20% na área da máscara.
* **Por que:** Precisamos que a máscara cubra um pouco da pele ao redor do objeto. Isso permite que o Imagen 3 "repinte" a pele com as novas sombras e reflexos do produto, garantindo o realismo.
* *Ação:* Crie uma função que receba o BBOX do JSON, adicione margem de segurança e gere a imagem binária (preto/branco) para enviar ao Imagen.

### Passo 3: Chamada ao Imagen 3 (Vertex AI)
Utilize o modelo `imagen-3.0-capability-001` (ou versão mais atual disponível na lib).
Parâmetros recomendados para permitir criatividade:
* `guidanceScale`: Defina entre **15 e 20** (Não use 60+). Valores menores dão mais liberdade para a IA ajustar a luz e o blend.
* `maskExpansion`: Se a API suportar, ative. Caso contrário, confie na dilatação feita no Passo 2.

---

## 4. O que eu preciso que você faça agora
Gere o código completo (pode ser em Python usando `google-cloud-aiplatform`) que:
1.  Autentique na Vertex AI.
2.  Tenha uma função `get_creative_direction(user_img, product_img)` chamando o Gemini.
3.  Tenha uma função `create_dilated_mask(bbox, image_size)` usando PIL/OpenCV.
4.  Tenha uma função `generate_final_look(base_img, mask, prompt)` chamando o Imagen 3.
5.  Execute o fluxo completo.