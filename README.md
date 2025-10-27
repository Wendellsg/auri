# AUVP Uploader

Painel administrativo moderno para equipes internas realizarem upload, versionamento e distribuição de arquivos a partir de um bucket S3 dedicado. As URLs originais dos objetos são automaticamente reescritas para o host configurado da CDN, garantindo performance e governança.

## Stack principal

- **Next.js 16 (App Router)** – Rendering híbrido, rotas `app` e API handlers em `/api`.
- **React 19** – Componentes client/server convivendo com hooks modernos.
- **Tailwind CSS v4 + shadcn-inspired UI** – Design system com componentes reutilizáveis (`button`, `card`, `table`, etc.).
- **AWS SDK v3 (S3)** – Upload, listagem e exclusão de objetos diretamente no bucket configurado.
- **Prisma + MongoDB** – Persistência de usuários, permissões e credenciais de storage com schema consistente e sincronização via `db push`.

## Pré-requisitos

- Node.js 18+ (recomendado 20 LTS).
- Conta AWS com credenciais IAM com permissão mínima em S3 (`s3:ListBucket`, `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`).
- Bucket S3 dedicado para o painel.
- CDN configurada (CloudFront, Fastly, etc.) apontada para o bucket.

## Variáveis de ambiente

Use o arquivo `.env.example` como base para criar `.env.local`:

```bash
cp .env.example .env.local
```

Preencha `DATABASE_URL` com a conexão do seu cluster MongoDB. Os campos de AWS/CDN podem ficar vazios se você preferir configurar tudo diretamente pelo painel de configurações (`/settings`). Defina também `AUTH_SECRET` com um valor aleatório e forte para assinar os tokens JWT utilizados na autenticação.

### Banco de dados local

Se preferir usar o MongoDB em contêiner, basta subir o serviço que acompanha o projeto:

```bash
docker compose up -d mongo
```

O container expõe `mongodb://root:root@localhost:27017/auvp_uploader?authSource=admin`, exatamente o valor sugerido em `.env.example`.

## Como rodar localmente

1. (Opcional) Suba o MongoDB local conforme descrito acima.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Gere o Prisma Client e crie o schema no banco (usa `db push`):
   ```bash
   npm run prisma:push
   ```
4. Opcional: abra o Prisma Studio para inspecionar dados:
   ```bash
   npm run prisma:studio
   ```
5. Execute a aplicação em modo desenvolvimento:
   ```bash
   npm run dev
   ```
6. Acesse [http://localhost:3000](http://localhost:3000).
7. Você será redirecionado para `/onboarding` para concluir o setup inicial (host, usuário admin e credenciais AWS).

### Comandos úteis

- `npm run dev` – servidor Next.js em modo desenvolvimento.
- `npm run build` – build otimizado para produção.
- `npm start` – sobe o build de produção.
- `npm run lint` – analisa o código com ESLint/TypeScript.
- `npm run prisma:generate` – regenera o Prisma Client ao alterar o schema.
- `npm run prisma:push` – aplica o schema atual no banco (útil em desenvolvimento).
- `npm run prisma:studio` – abre interface web para inspecionar registros.

## Arquitetura e pastas relevantes

```
app/
  layout.tsx                   → casco global com fontes e tema
  (private)/layout.tsx         → layout autenticado com cabeçalho e container
  (private)/page.tsx           → workspace de arquivos com dropzone e navegação estilo file-system
  (private)/dashboard/page.tsx → visão executiva com métricas e checklist operacional
  (private)/users/page.tsx     → painel de usuários, permissões e senha temporária
  (private)/settings/page.tsx  → formulário de credenciais S3/CDN para administradores
  login/page.tsx               → tela de autenticação baseada em JWT
  onboarding/page.tsx          → wizard de setup inicial (executado no primeiro acesso)
app/api/
  auth/login             → autenticação via e-mail/senha com JWT + cookies HttpOnly
  auth/logout            → encerra sessão limpando cookie
  auth/session           → retorna dados mínimos da sessão atual
  files/route.ts         → GET/POST/DELETE integrados ao S3 via credenciais do banco
  users/route.ts         → GET/POST para gestão de usuários e senhas temporárias
  settings/route.ts      → GET/PUT para manter as credenciais de storage
components/
  auth/login-form.tsx    → formulário client-side responsável pelo fluxo de login
  dashboard/             → componentes de tela (arquivos, usuários, configurações)
  layout/                → cabeçalho, menu do usuário e shell da interface
  ui/                    → kit shadcn-tailwind (button, card, table etc.)
lib/
  auth.ts                → helpers para JWT, cookies e autorização
  prisma.ts              → client Prisma singleton
  settings.ts            → acesso centralizado às credenciais de storage
  users.ts               → repositório de usuários/prisma
  password.ts            → gerador de senhas fortes e hashing
  aws.ts                 → helpers de S3/CDN
prisma/schema.prisma     → schema do banco com Prisma
.env.example             → exemplo de variáveis de ambiente
```

## Fluxo de upload e CDN

1. Usuário seleciona arquivo e (opcionalmente) define o prefixo/pasta.
2. O backend (`POST /api/files`) carrega as credenciais gravadas no MongoDB (`/settings`) e envia o objeto para o S3 (`PutObjectCommand`).
3. A URL de retorno é reescrita com `toCdnUrl`, trocando o host pelo domínio CDN configurado.
4. O dashboard atualiza a listagem chamando `GET /api/files`. Caso o storage ainda não esteja configurado, um dataset mockado é exibido com orientação para finalizar o setup.
5. A interface apresenta uma fila de uploads em andamento com progresso individual e feedback de sucesso/erro.

### Exclusão

`DELETE /api/files?key=path/do/arquivo` remove o objeto no bucket, permitindo gerenciar o ciclo de vida direto do painel.

### Thumbnails inteligentes

- A listagem exibe miniaturas para imagens e ícones dinâmicos para vídeos, áudios, PDFs/textos e demais formatos.
- As URLs da CDN são renderizadas sempre que disponíveis, garantindo que as miniaturas aproveitem cache na borda.
- Para pré-visualizar conteúdo completo (vídeo/áudio/PDF), abra o link direto ou via CDN e mantenha o bucket/CDN com CORS liberado para o painel.

## Gestão de usuários

- `GET /api/users` consulta diretamente o MongoDB via Prisma e devolve usuários + permissões disponíveis.
- `POST /api/users` valida o payload, persiste o usuário como `invited` e retorna uma senha temporária gerada por `generateSecurePassword` (hash armazenado no banco).
- O painel exibe métricas, permite filtrar por nome/e-mail/perfil e copia a senha temporária com um clique.
- Utilize `npm run prisma:studio` para administrar usuários e atualizar status manualmente caso necessário.

## Autenticação e autorização

- Login feito em `/login` envia `POST /api/auth/login`, valida credenciais no MongoDB (hash `scrypt`) e gera JWT assinado com `AUTH_SECRET`.
- O token é armazenado em cookie `HttpOnly` e renovado automaticamente a cada acesso; o logout limpa o cookie via `POST /api/auth/logout`.
- Middleware (`middleware.ts`) protege todas as rotas de aplicação e APIs (exceto `/api/auth/*`), redirecionando usuários não autenticados para `/login`.
- APIs de usuários e configurações exigem perfil `admin`; uploads exigem pelo menos `editor`.
- O primeiro acesso dispara o onboarding em `/onboarding` solicitando host do app, credenciais AWS e criação do usuário administrador. O fluxo só libera as demais rotas após conclusão.

## Boas práticas e próximos passos sugeridos

- Criar camada de autenticação real (NextAuth, Cognito, etc.) utilizando as senhas geradas.
- Salvar auditoria de uploads/downloads para compliance.
- Provisionar infraestrutura IaC (Terraform/CDK) para bucket, CDN e secrets.
- Implementar cache e paginação de objetos grandes via `ContinuationToken`.
- Integrar notificações (Slack, e-mail) para avisar uploads críticos.
- Adicionar criptografia em repouso às credenciais e rotação automática das chaves AWS.

## Lista de tarefas (roadmap)

- [x] Dashboard de arquivos com upload, estatísticas e integração com CDN.
- [x] Painel de usuários com geração automática de senha e filtros.
- [x] API `/api/files` com GET/POST/DELETE para S3.
- [x] API `/api/users` com persistência via Prisma/MongoDB.
- [x] Design system base com componentes shadcn-tailwind.
- [x] Implementar autenticação e sessão por usuário.
- [ ] Adicionar testes automatizados (unitários e de integração API).
- [ ] Habilitar paginação e ordenação avançada na tabela de arquivos.

## Referências adicionais

- [Documentação AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/index.html)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/) – inspiração para os componentes utilizados
