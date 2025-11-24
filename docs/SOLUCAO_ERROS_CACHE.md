# Solução de Erros de Cache e Build do Next.js

Este documento contém soluções para os problemas mais comuns relacionados a cache, build e erros de compilação no Next.js.

## 📋 Índice

1. [Limpeza de Cache](#limpeza-de-cache)
2. [Arquivos de Backup que Causam Erros](#arquivos-de-backup-que-causam-erros)
3. [Erros de Build no Vercel](#erros-de-build-no-vercel)
4. [Script Automatizado](#script-automatizado)

---

## 🧹 Limpeza de Cache

Para corrigir erros de `globals.css` não encontrado, 404, ou problemas de cache do Next.js.

### Passos Manuais (Windows PowerShell)

**1. Parar todos os servidores primeiro** (Ctrl+C ou fechar terminais)

**2. Limpar cache de todos os projetos:**

```powershell
# Limpar modelo 1
Remove-Item -Path "E:\projetos\apps-cliente\modelo-1\.next" -Recurse -Force -ErrorAction SilentlyContinue

# Limpar modelo 2
Remove-Item -Path "E:\projetos\apps-cliente\modelo-2\.next" -Recurse -Force -ErrorAction SilentlyContinue

# Limpar modelo 3
Remove-Item -Path "E:\projetos\apps-cliente\modelo-3\.next" -Recurse -Force -ErrorAction SilentlyContinue

# Limpar painel adm
Remove-Item -Path "E:\projetos\paineladm\.next" -Recurse -Force -ErrorAction SilentlyContinue
```

**3. Reiniciar os servidores:**

```powershell
# Terminal 1 (Modelo 1)
cd E:\projetos\apps-cliente\modelo-1
npm run dev -- -p 3015

# Terminal 2 (Modelo 3)
cd E:\projetos\apps-cliente\modelo-3
npm run dev -- -p 3010

# Terminal 3 (Painel Adm)
cd E:\projetos\paineladm
npm run dev
```

---

## 🗂️ Arquivos de Backup que Causam Erros

Arquivos de backup (como `BACKUP_LAYOUT_LOJISTA_20251120_021000.tsx`) podem causar erros de build no Vercel porque:

- Tentam importar módulos que não existem mais
- Estão desatualizados e referenciam componentes removidos
- O TypeScript tenta compilar todos os arquivos `.tsx` e `.ts` no projeto

### Como Verificar e Remover Arquivos de Backup

**1. Procurar arquivos de backup no projeto:**

```powershell
# No diretório do projeto (ex: paineladm)
cd E:\projetos\paineladm

# Procurar arquivos com padrão de backup
Get-ChildItem -Recurse -Filter "*BACKUP*" -File
Get-ChildItem -Recurse -Filter "*backup*" -File
Get-ChildItem -Recurse -Filter "*2024*" -File
Get-ChildItem -Recurse -Filter "*2025*" -File
```

**2. Verificar se o arquivo causa erro:**

- Se o arquivo tiver imports quebrados ou referências a componentes inexistentes, remova-o
- Arquivos de backup devem estar em um diretório separado ou excluídos do controle de versão

**3. Remover arquivo problemático:**

```powershell
# Exemplo: remover arquivo de backup específico
Remove-Item -Path "E:\projetos\paineladm\BACKUP_LAYOUT_LOJISTA_20251120_021000.tsx" -Force
```

**4. Adicionar ao .gitignore (recomendado):**

Para evitar que arquivos de backup sejam commitados no futuro:

```gitignore
# Arquivos de backup
*BACKUP*
*backup*
*_backup.*
*.bak
*.old
```

---

## 🚀 Erros de Build no Vercel

### Erro: "Cannot find module" ou "Type error"

**Causas comuns:**
- Arquivos de backup com imports quebrados
- Módulos não encontrados
- Dependências faltando no `package.json`

**Solução:**

1. **Verificar logs do build no Vercel:**
   - Acesse o dashboard do Vercel
   - Veja os logs de build para identificar o arquivo problemático

2. **Remover arquivos problemáticos:**
   ```powershell
   # Remover arquivo específico que está causando erro
   Remove-Item -Path "caminho/do/arquivo/problematico.tsx" -Force
   ```

3. **Verificar imports:**
   - Certifique-se de que todos os imports estão corretos
   - Verifique se os caminhos dos módulos estão corretos

4. **Limpar cache e fazer novo deploy:**
   ```powershell
   # Limpar cache local
   Remove-Item -Path ".next" -Recurse -Force
   
   # Fazer commit e push
   git add .
   git commit -m "fix: remover arquivo de backup que causa erro no build"
   git push
   ```

### Erro: "Found lockfile missing swc dependencies"

**Solução:**
```powershell
# No diretório do projeto
npm install
npm run build
```

---

## 🤖 Script Automatizado

Crie um script PowerShell para automatizar a limpeza de cache:

```powershell
# limpar-cache.ps1
Write-Host "🧹 Limpando cache do Next.js..." -ForegroundColor Cyan

$projetos = @(
    "E:\projetos\apps-cliente\modelo-1",
    "E:\projetos\apps-cliente\modelo-2",
    "E:\projetos\apps-cliente\modelo-3",
    "E:\projetos\paineladm"
)

foreach ($projeto in $projetos) {
    $cachePath = Join-Path $projeto ".next"
    if (Test-Path $cachePath) {
        Write-Host "Removendo cache de: $projeto" -ForegroundColor Yellow
        Remove-Item -Path $cachePath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✓ Cache removido" -ForegroundColor Green
    } else {
        Write-Host "Cache não encontrado em: $projeto" -ForegroundColor Gray
    }
}

Write-Host "`n✅ Limpeza concluída!" -ForegroundColor Green
Write-Host "Reinicie os servidores de desenvolvimento." -ForegroundColor Cyan
```

**Como usar:**
```powershell
# Executar o script
.\limpar-cache.ps1
```

---

## 📝 Checklist Antes de Fazer Deploy

- [ ] Limpar cache local (`.next`)
- [ ] Verificar se não há arquivos de backup no projeto
- [ ] Testar build local: `npm run build`
- [ ] Verificar se todos os imports estão corretos
- [ ] Verificar se não há erros de TypeScript: `npm run type-check` (se disponível)
- [ ] Fazer commit e push
- [ ] Verificar logs do build no Vercel

---

## 🔍 Comandos Úteis

```powershell
# Verificar erros de TypeScript
npx tsc --noEmit

# Limpar node_modules e reinstalar (último recurso)
Remove-Item -Path "node_modules" -Recurse -Force
Remove-Item -Path "package-lock.json" -Force
npm install

# Verificar arquivos grandes ou problemáticos
Get-ChildItem -Recurse -File | Where-Object { $_.Length -gt 1MB } | Select-Object FullName, Length
```

