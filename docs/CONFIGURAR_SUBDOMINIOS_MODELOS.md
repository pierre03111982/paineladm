# 🌐 Configurar Subdomínios Profissionais para os Modelos

Este guia explica como configurar subdomínios profissionais para cada modelo do aplicativo cliente, tornando os links mais profissionais e fáceis de compartilhar.

## 📋 Visão Geral

Ao invés de usar URLs longas ou com portas, você terá:
- **Modelo 1**: `https://app1.experimenteai.com.br`
- **Modelo 2**: `https://app2.experimenteai.com.br`
- **Modelo 3**: `https://app3.experimenteai.com.br`

## 🚀 Opção 1: Configurar no Vercel (Recomendado)

### Passo 1: Deploy dos 3 Modelos no Vercel

Para cada modelo (1, 2, 3), faça o deploy no Vercel:

1. **Acesse o Vercel Dashboard**
2. **Crie 3 projetos separados**:
   - Projeto 1: `modelo-1` (Root Directory: `apps-cliente/modelo-1`)
   - Projeto 2: `modelo-2` (Root Directory: `apps-cliente/modelo-2`)
   - Projeto 3: `modelo-3` (Root Directory: `apps-cliente/modelo-3`)

### Passo 2: Configurar Domínio Personalizado

é mel
1. **Vá em Settings → Domains**
2. **Adicione o subdomínio**:
   - Para Modelo 1: `app1.experimenteai.com.br`
   - Para Modelo 2: `app2.experimenteai.com.br`
   - Para Modelo 3: `app3.experimenteai.com.br`

3. **Siga as instruções do Vercel** para configurar o DNS:
   - O Vercel fornecerá um registro CNAME
   - Você precisará adicionar este registro no seu provedor de DNS

### Passo 3: Configurar DNS no Provedor

No seu provedor de DNS (Cloudflare, GoDaddy, Registro.br, etc.):

#### Para Cloudflare:
1. Acesse o Cloudflare Dashboard
2. Selecione o domínio `experimenteai.com.br`
3. Vá em **DNS → Records**
4. Adicione os seguintes registros CNAME:

```
Tipo: CNAME
Nome: app1
Conteúdo: cname.vercel-dns.com
Proxy: Ativado (nuvem laranja)
TTL: Auto
```

```
Tipo: CNAME
Nome: app2
Conteúdo: cname.vercel-dns.com
Proxy: Ativado (nuvem laranja)
TTL: Auto
```

```
Tipo: CNAME
Nome: app3
Conteúdo: cname.vercel-dns.com
Proxy: Ativado (nuvem laranja)
TTL: Auto
```

#### Para outros provedores:
- Siga as instruções do Vercel que aparecem ao adicionar o domínio
- Geralmente será um registro CNAME apontando para `cname.vercel-dns.com`

### Passo 4: Configurar Variáveis de Ambiente no Painel Adm

No projeto **paineladm** no Vercel:

1. **Vá em Settings → Environment Variables**
2. **Adicione as seguintes variáveis** (Production):

```env
NEXT_PUBLIC_MODELO_1_URL=https://app1.experimenteai.com.br
NEXT_PUBLIC_MODELO_2_URL=https://app2.experimenteai.com.br
NEXT_PUBLIC_MODELO_3_URL=https://app3.experimenteai.com.br
```

3. **Faça um novo deploy** do paineladm para aplicar as mudanças

## 🔧 Opção 2: Configurar com Nginx (Servidor Próprio)

Se você tem um servidor próprio, pode usar Nginx como proxy reverso:

### Configuração Nginx

Crie um arquivo de configuração para cada modelo:

#### `/etc/nginx/sites-available/app1.experimenteai.com.br`

```nginx
server {
    listen 80;
    server_name app1.experimenteai.com.br;

    location / {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### `/etc/nginx/sites-available/app2.experimenteai.com.br`

```nginx
server {
    listen 80;
    server_name app2.experimenteai.com.br;

    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### `/etc/nginx/sites-available/app3.experimenteai.com.br`

```nginx
server {
    listen 80;
    server_name app3.experimenteai.com.br;

    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Ativar Configurações

```bash
# Criar links simbólicos
sudo ln -s /etc/nginx/sites-available/app1.experimenteai.com.br /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/app2.experimenteai.com.br /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/app3.experimenteai.com.br /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

### Configurar SSL com Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificados SSL
sudo certbot --nginx -d app1.experimenteai.com.br
sudo certbot --nginx -d app2.experimenteai.com.br
sudo certbot --nginx -d app3.experimenteai.com.br
```

## 📝 Configurar Variáveis de Ambiente

### No Painel Adm (Vercel ou Servidor)

Adicione as variáveis de ambiente:

```env
# Produção
NEXT_PUBLIC_MODELO_1_URL=https://app1.experimenteai.com.br
NEXT_PUBLIC_MODELO_2_URL=https://app2.experimenteai.com.br
NEXT_PUBLIC_MODELO_3_URL=https://app3.experimenteai.com.br
```

### Localmente (Desenvolvimento)

Crie um arquivo `.env.local` no projeto `paineladm`:

```env
# Desenvolvimento Local (usa portas)
NEXT_PUBLIC_MODELO_1_PORT=3004
NEXT_PUBLIC_MODELO_2_PORT=3005
NEXT_PUBLIC_MODELO_3_PORT=3010
```

## ✅ Verificação

Após configurar tudo:

1. **Acesse o Painel Adm**
2. **Vá em "Aplicativo Cliente"**
3. **Verifique se os links aparecem com os subdomínios**:
   - `https://app1.experimenteai.com.br/{lojistaId}/login`
   - `https://app2.experimenteai.com.br/{lojistaId}/login`
   - `https://app3.experimenteai.com.br/{lojistaId}/login`

4. **Teste cada link** para garantir que está funcionando

## 🔍 Troubleshooting

### Subdomínio não está funcionando

1. **Verifique o DNS**: Use `nslookup app1.experimenteai.com.br` ou `dig app1.experimenteai.com.br`
2. **Aguarde propagação**: DNS pode levar até 48 horas (geralmente 1-2 horas)
3. **Verifique no Vercel**: Settings → Domains → Verifique se o domínio está "Valid"

### Erro 404 no subdomínio

1. **Verifique se o projeto está deployado** no Vercel
2. **Verifique se o domínio está conectado** ao projeto correto
3. **Verifique as variáveis de ambiente** no paineladm

### SSL não está funcionando

1. **Aguarde alguns minutos** após adicionar o domínio no Vercel
2. **Verifique se o DNS está configurado corretamente**
3. **No Vercel**: Settings → Domains → Force HTTPS deve estar ativado

## 📚 Recursos Adicionais

- [Documentação Vercel - Domains](https://vercel.com/docs/concepts/projects/domains)
- [Documentação Cloudflare - DNS](https://developers.cloudflare.com/dns/)
- [Let's Encrypt - Certbot](https://certbot.eff.org/)

---

**Última atualização**: $(date)


