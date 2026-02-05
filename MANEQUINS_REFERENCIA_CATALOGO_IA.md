# Manequins de referência — Catálogo IA

Documentação da pasta de **imagens de referência de manequim** usadas pelo Estúdio Criativo (IA) para gerar **Foto Frente** e **Foto Costas** sem a IA inventar o manequim — ela combina o produto com o manequim já pronto.

## Onde ficam as imagens

- **Infantil (grade infantil):**  
  `public/assets/mannequins/infantil/`  
  Arquivos: `manequim-infantil-frente` e `manequim-infantil-costas`, em qualquer formato suportado (PNG, JPG, JPEG, WEBP). O sistema detecta automaticamente a extensão.  
  Ver detalhes em: [public/assets/mannequins/infantil/README.md](public/assets/mannequins/infantil/README.md).

- **Outros públicos (futuro):**  
  Mesma convenção em subpastas por público, por exemplo:
  - `public/assets/mannequins/adulto/` → `manequim-adulto-frente`, `manequim-adulto-costas`
  - `public/assets/mannequins/bebe/` → `manequim-bebe-frente`, `manequim-bebe-costas`

## Uso no fluxo

1. **Hoje:** A pasta infantil foi criada para você anexar as duas fotos (frente e costas do manequim infantil). O próximo passo é **implementar** no fluxo do Catálogo IA:
   - Na geração de **Foto Frente** e **Foto Costas**, quando o produto for da **grade infantil** (`targetAudience === "infantil"` ou equivalente), a API `generate-studio` (ou o serviço que chama a Imagen) deve usar as URLs dessas imagens estáticas como **imagem de referência do manequim** (em vez de só prompt de “ghost mannequin”).
2. **Depois:** Replicar a lógica para adulto e bebê quando houver as pastas e imagens correspondentes.

## Pontos de integração no código

- **API:** `src/app/api/lojista/products/generate-studio/route.ts` — já recebe `fotoFrenteUrl` e `fotoCostasUrl`; pode-se derivar as URLs do manequim de referência a partir de `targetAudience` (ex.: infantil → `/assets/mannequins/infantil/manequim-infantil-frente.jpg`).
- **Front:** Componentes do Estúdio (ex.: `ProductStudioInline`, `ProductEditorLayout`) — garantir que, para produtos infantis, o `targetAudience` (ou grade) seja enviado e que a API use as imagens da pasta `mannequins/infantil/`.

## Resumo

| Público  | Pasta                          | Arquivos esperados                          | Status      |
|----------|--------------------------------|---------------------------------------------|-------------|
| Infantil | `public/assets/mannequins/infantil/` | `manequim-infantil-frente`, `manequim-infantil-costas` | Pasta criada; falta integrar na geração |
| Adulto   | `public/assets/mannequins/adulto/`   | `manequim-adulto-frente`, `manequim-adulto-costas`     | A implementar depois |
| Bebê     | `public/assets/mannequins/bebe/`     | `manequim-bebe-frente`, `manequim-bebe-costas`         | A implementar depois |
