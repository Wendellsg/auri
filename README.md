# AUVP Uploader

Painel administrativo moderno para equipes internas realizarem upload, versionamento e distribuição de arquivos a partir de um bucket S3 dedicado. As URLs originais dos objetos são automaticamente reescritas para o host configurado da CDN, garantindo performance e governança.

## Stack principal

- **Next.js 16 (App Router)** – Rendering híbrido, rotas `app` e API handlers em `/api`.
- **React 19** – Componentes client/server convivendo com hooks modernos.
- **Tailwind CSS v4 + shadcn-inspired UI** – Design system com componentes reutilizáveis (`button`, `card`, `table`, etc.).
- **AWS SDK v3 (S3)** – Upload, listagem e exclusão de objetos diretamente no bucket configurado.
- **Persistência local com JSON** – Armazena o cadastro de usuários e permissões em `data/users.json`.

## Pré-requisitos

- Node.js 18+ (recomendado 20 LTS).
- Conta AWS com credenciais IAM com permissão mínima em S3 (`s3:ListBucket`, `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`).
- Bucket S3 dedicado para o painel.
- CDN configurada (CloudFront, Fastly, etc.) apontada para o bucket.

## Variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto com as variáveis abaixo:

```bash
AWS_ACCESS_KEY_ID="seu_access_key"
AWS_SECRET_ACCESS_KEY="seu_secret_key"
AWS_REGION="sa-east-1"
S3_BUCKET_NAME="nome-do-seu-bucket"
# informe apenas host (cdn.exemplo.com) ou URL completa (https://cdn.exemplo.com)
CDN_HOST="cdn.exemplo.com"
```

Opcionalmente você pode definir `NEXT_PUBLIC_APP_URL` para apontar fetches do lado do servidor em ambientes diferentes de desenvolvimento.

## Como rodar localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Execute a aplicação em modo desenvolvimento:
   ```bash
   npm run dev
   ```
3. Acesse [http://localhost:3000](http://localhost:3000).

### Comandos úteis

- `npm run dev` – servidor Next.js em modo desenvolvimento.
- `npm run build` – build otimizado para produção.
- `npm start` – sobe o build de produção.
- `npm run lint` – analisa o código com ESLint/TypeScript.

## Arquitetura e pastas relevantes

```
app/
  layout.tsx          → layout raiz com header persistente
  page.tsx            → dashboard de arquivos (upload, listagem, métricas)
  users/page.tsx      → painel de usuários, permissões e senha temporária
app/api/
  files/route.ts      → GET/POST/DELETE para integração com S3 e CDN
  users/route.ts      → GET/POST para gestão de usuários e senhas geradas
components/
  dashboard/          → componentes de tela (arquivos/usuários)
  layout/             → cabeçalho e shell da interface
  ui/                 → kit shadcn-tailwind (button, card, table etc.)
data/users.json       → seed local com usuários e permissões disponíveis
lib/aws.ts            → cliente S3 e utilitário de reescrita para CDN
lib/password.ts       → gerador de senhas fortes
lib/users-store.ts    → abstração de persistência em arquivo
```

## Fluxo de upload e CDN

1. Usuário seleciona arquivo e (opcionalmente) define pasta e permissões.
2. O backend (`POST /api/files`) envia o objeto para S3 (`PutObjectCommand`), grava as permissões no metadata e retorna a URL pública do S3.
3. A URL é reescrita pelo helper `toCdnUrl`, substituindo o host pelo domínio CDN configurado.
4. O dashboard atualiza a listagem chamando `GET /api/files`. Quando as variáveis AWS não estão configuradas, é entregue um payload mockado para viabilizar o design sem integração.

### Exclusão

`DELETE /api/files?key=path/do/arquivo` remove o objeto no bucket, permitindo gerenciar o ciclo de vida direto do painel.

## Gestão de usuários

- `GET /api/users` devolve usuários armazenados em `data/users.json` junto com a lista de permissões disponíveis.
- `POST /api/users` valida o payload, persiste o usuário como `invited` e retorna uma senha temporária gerada por `generateSecurePassword`.
- O painel exibe métricas, permite filtrar por nome/e-mail/perfil e copia a senha temporária com um clique.
- O arquivo `data/users.json` pode ser versionado com dados fictícios para desenvolvimento; em produção substitua por banco ou API real.

## Boas práticas e próximos passos sugeridos

- Criar camada de autenticação real (NextAuth, Cognito, etc.) utilizando as senhas geradas.
- Salvar auditoria de uploads/downloads para compliance.
- Provisionar infraestrutura IaC (Terraform/CDK) para bucket, CDN e secrets.
- Implementar cache e paginação de objetos grandes via `ContinuationToken`.
- Integrar notificações (Slack, e-mail) para avisar uploads críticos.

## Lista de tarefas (roadmap)

- [x] Dashboard de arquivos com upload, estatísticas e integração com CDN.
- [x] Painel de usuários com geração automática de senha e filtros.
- [x] API `/api/files` com GET/POST/DELETE para S3.
- [x] API `/api/users` com persistência local em JSON.
- [x] Design system base com componentes shadcn-tailwind.
- [ ] Implementar autenticação e sessão por usuário.
- [ ] Adicionar testes automatizados (unitários e de integração API).
- [ ] Conectar painel de usuários a um serviço de e-mail para envio de credenciais.
- [ ] Criar logs estruturados e métricas (CloudWatch / OpenTelemetry).
- [ ] Habilitar paginação e ordenação avançada na tabela de arquivos.

## Referências adicionais

- [Documentação AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/index.html)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/) – inspiração para os componentes utilizados
