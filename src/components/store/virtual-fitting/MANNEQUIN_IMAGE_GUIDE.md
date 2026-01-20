# Guia: Substituir Placeholder SVG por Imagem Real do Manequim

## 📋 Situação Atual

O componente `DynamicMannequin.tsx` atualmente usa um **SVG placeholder** que desenha uma silhueta básica do manequim. Para um visual profissional estilo Sizebay, você precisa substituir por uma **imagem PNG realista**.

## 🎯 Opção 1: Usar Imagem PNG (Recomendado)

### Passo 1: Obter a Imagem

1. Acesse sites como:
   - **Freepik**: https://www.freepik.com/search?format=search&query=3d%20mannequin%20body
   - **Flaticon**: https://www.flaticon.com/search?word=mannequin
   - **Noun Project**: https://thenounproject.com/search/?q=mannequin

2. Baixe uma imagem de **manequim 3D** em:
   - Formato: PNG com fundo transparente
   - Estilo: Minimalista, cinza claro (#E5E7EB a #9CA3AF)
   - Pose: Frontal, braços levemente afastados

### Passo 2: Processar a Imagem

1. Use um editor (Photoshop, GIMP, Figma) para:
   - Remover o fundo (tornar transparente)
   - Ajustar cores para tons de cinza (#E5E7EB a #9CA3AF)
   - Redimensionar para aproximadamente 240x480px (proporção mantida)

2. Salve como: `mannequin_body.png` (feminino) e `mannequin_body_male.png` (masculino)

### Passo 3: Colocar no Projeto

Crie a pasta se não existir:
```
public/assets/measurements/
```

Coloque os arquivos:
- `public/assets/measurements/mannequin_body.png`
- `public/assets/measurements/mannequin_body_male.png`

### Passo 4: Atualizar o Componente

No arquivo `DynamicMannequin.tsx`, substitua o SVG placeholder por:

```tsx
{/* 1. Imagem Base do Manequim */}
<div className="absolute inset-0 flex items-center justify-center">
  <img
    src="/assets/measurements/mannequin_body.png"
    alt="Manequim"
    className="w-full h-full object-contain opacity-90"
  />
</div>
```

Para versão masculina:
```tsx
<img
  src={gender === "female" 
    ? "/assets/measurements/mannequin_body.png"
    : "/assets/measurements/mannequin_body_male.png"}
  alt="Manequim"
  className="w-full h-full object-contain opacity-90"
/>
```

## 🎨 Opção 2: Melhorar o SVG Placeholder

Se preferir manter o SVG, você pode:

1. Usar um gerador de SVG de silhuetas humanas
2. Editar manualmente os paths para deixar mais realista
3. Adicionar mais detalhes (ombros, curvas do corpo)

**Nota**: O SVG atual é funcional, mas uma imagem PNG profissional ficará muito melhor.

## ✅ Checklist

- [ ] Imagem PNG com fundo transparente
- [ ] Cores em tons de cinza (#E5E7EB a #9CA3AF)
- [ ] Proporção ~240x480px
- [ ] Arquivo salvo em `public/assets/measurements/`
- [ ] Componente atualizado para usar `<img>` ao invés de SVG

## 📝 Notas Técnicas

- As **faixas de tensão** (overlays) estão posicionadas em porcentagens do container (22%, 38%, 51% do topo)
- Os **indicadores laterais** aparecem à direita do manequim
- Se mudar as dimensões da imagem, pode ser necessário ajustar as posições das faixas (top: "22%", "38%", "51%")
