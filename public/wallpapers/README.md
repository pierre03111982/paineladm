# Wallpapers da Sidebar

Esta pasta contém as imagens de papel de parede personalizáveis para a sidebar do painel administrativo.

## Como Adicionar Novos Wallpapers

1. **Formato das Imagens:**
   - Use imagens JPG ou WebP otimizadas
   - Tamanho recomendado: 512x1024px (proporção 9:16)
   - Peso máximo recomendado: 200KB por imagem

2. **Nomenclatura:**
   - Use nomes descritivos: `bg-abstract.jpg`, `bg-geometric.jpg`, etc.
   - Evite espaços e caracteres especiais

3. **Registrar no Código:**
   - Adicione a nova opção em `src/hooks/useSidebarWallpaper.ts` no array `WALLPAPER_OPTIONS`
   - Exemplo:
     ```typescript
     { 
       id: "bg-novo", 
       name: "Novo Estilo", 
       filename: "bg-novo.jpg", 
       thumbnail: "/wallpapers/bg-novo.jpg" 
     }
     ```

## Imagens Padrão

As seguintes imagens são esperadas pelo sistema (adicione-as conforme necessário):

- `bg-1.jpg` - Abstrato 1
- `bg-2.jpg` - Abstrato 2
- `bg-3.jpg` - Geométrico
- `bg-abstract.jpg` - Abstrato Moderno
- `bg-geometric.jpg` - Geométrico Tech

**Nota:** Se uma imagem não existir, o sistema mostrará um fallback. Certifique-se de adicionar todas as imagens referenciadas no código.
