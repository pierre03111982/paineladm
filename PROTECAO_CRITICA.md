# 🚨 PROTEÇÃO CRÍTICA - LAYOUT DO LOJISTA

## ⚠️ ATENÇÃO MÁXIMA

O arquivo `src/app/(lojista)/layout.tsx` foi deletado **MÚLTIPLAS VEZES** durante commits.

## 🔒 MEDIDAS DE PROTEÇÃO IMPLEMENTADAS

### 1. Git Hook Pre-Commit
- ✅ Verifica se o arquivo existe antes de cada commit
- ✅ Verifica se o arquivo não está vazio
- ✅ Verifica se contém componentes essenciais (LojistaNav, sidebar)
- ✅ **BLOQUEIA COMMITS** se o arquivo estiver faltando ou incorreto

### 2. Backup Automático
- ✅ Backup criado: `BACKUP_LAYOUT_LOJISTA_[timestamp].tsx`
- ✅ Sempre mantenha pelo menos um backup recente

### 3. Verificação Manual
Execute antes de cada commit:
```powershell
cd E:\projetos\paineladm
.\scripts\verificar-arquivos-criticos.ps1
```

## 📋 CHECKLIST ANTES DE COMMITAR

- [ ] Layout existe: `src/app/(lojista)/layout.tsx`
- [ ] Layout não está vazio (mínimo 1000 bytes)
- [ ] Layout contém `LojistaNav`
- [ ] Layout contém `aside` (sidebar)
- [ ] Nav-items tem 9 itens
- [ ] Executei o script de verificação

## 🚨 SE O ARQUIVO FOR DELETADO

1. **NÃO FAÇA COMMIT**
2. Restaure imediatamente:
   ```powershell
   # Do backup mais recente
   Copy-Item BACKUP_LAYOUT_LOJISTA_*.tsx "src\app\(lojista)\layout.tsx"
   
   # Ou do último commit
   git checkout HEAD -- src/app/(lojista)/layout.tsx
   ```
3. Verifique o histórico:
   ```powershell
   git log --all --full-history -- src/app/(lojista)/layout.tsx
   ```

## 📝 ESTRUTURA MÍNIMA DO LAYOUT

O layout DEVE conter:
- ✅ Import de `LojistaNav`
- ✅ Import de `MobileNavLinks`
- ✅ Import de `LojistaLayoutUpdater`
- ✅ Componente `<aside>` com sidebar
- ✅ Componente `<LojistaNav />` dentro do aside
- ✅ Componente `<LojistaLayoutUpdater />` no final

## 🔍 VERIFICAÇÃO AUTOMÁTICA

O git hook verifica automaticamente:
- ✅ Existência do arquivo
- ✅ Tamanho mínimo (1000 bytes)
- ✅ Presença de "LojistaNav"
- ✅ Presença de "aside"
- ✅ Número de itens de navegação (>= 9)

---

**Última atualização**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Status**: ✅ Layout restaurado e protegido

