# 📤 Guia Rápido: enviar alterações para o repositório (git push)

## 1. Verificar o que mudou

```bash
cd E:\projetos\paineladm
git status
```

## 2. Preparar os arquivos (staging)

Adiciona todas as modificações seguras para commit.

```bash
git add .
```

Se quiser conferir antes:

```bash
git diff
```

## 3. Criar o commit

Escolha uma mensagem objetiva.

```bash
git commit -m "Fix: corrigir erro de TypeScript no teste de óculos"
```

Se aparecer mensagem dizendo que não há nada para commit, pule para o push.

## 4. Configurar o repositório remoto (uma única vez)

```bash
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
```

Já configurou antes? Pode pular este passo.

## 5. Enviar a branch para o repositório

```bash
git push -u origin main
```

Ou substitua `main` por `master`/`develop`/nome da sua branch.

## 6. Conferir

```bash
git status
```

Se aparecer “nothing to commit, working tree clean”, está tudo no repositório remoto.

---

### Dicas
- Evite fazer commit de arquivos sensíveis (`.env`, chaves, etc.).
- Se precisar trocar a mensagem do último commit antes do push:

  ```bash
  git commit --amend
  ```

- Para mandar uma branch nova:

  ```bash
  git push -u origin minha-feature
  ```

Pronto! Alterações seguradas no remoto. 🚀
