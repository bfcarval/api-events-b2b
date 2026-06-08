# API Events B2B - Orquestrador de Eventos

- **[Node.js](https://nodejs.org) & [TypeScript](https://typescriptlang.org)**
- **[Express](https://expressjs.com)** (API REST)
- **[Prisma ORM](https://prisma.io) & [PostgreSQL](https://postgresql.org)** (Persistência e Idempotência)
- **[BullMQ](https://bullmq.io) & [Redis](https://redis.io)** (Filas de Mensageria, Retries, DLQ e Rate Limiting)
- **[Zod](https://zod.dev)** (Validação de Schemas)
- **[Docker](https://docker.com) & [Docker Compose](https://docker.com)** (Containerização)


Microserviço escalável projetado para orquestrar e distribuir eventos de parceiros comerciais em alta concorrência.

---

## 🔗 Endpoints da API

A API roda por padrão na porta `3000`. Você pode testar os endpoints usando ferramentas como Postman, Insomnia ou a própria interface do Swagger.

### 1. Enviar um Novo Evento
*   **Rota:** `POST /api/events`
*   **Descrição:** Recebe e valida o evento do parceiro. Garante **idempotência** pelo ID. Se o ID já existir no banco, retorna HTTP `409 Conflict`.
*   **Payload Exemplo (JSON):**
```json
{
  "id": "e29e0618-9366-419b-b0b3-f0fa807ad5d9",
  "type": "VENDA",
  "origin": "PARCEIRO_ABC",
  "payload": {
    "total": 1500.00,
    "itens": [ { "produto": "Notebook", "qtd": 1 } ]
  }
}
```
*   **Respostas:** `202 Accepted` (Sucesso e enfileirado) ou `409 Conflict` (Evento duplicado).

### 2. Consultar Status do Evento
*   **Rota:** `GET /api/events/:id`
*   **Descrição:** Retorna o estado atual de processamento do evento.
*   **Status Possíveis:** `RECEBIDO`, `PROCESSANDO`, `SUCESSO`, `FALHA`, `DEAD_LETTER`.

### 3. Painel de Estatísticas
*   **Rota:** `GET /api/events/stats`
*   **Descrição:** Retorna o totalizador de eventos agrupados por status em tempo real.

### 4. Forçar Reprocessamento da Dead Letter (DLQ)
*   **Rota:** `POST /api/events/:id/retry`
*   **Descrição:** Move manualmente um evento travado na fila DLQ de volta para a esteira ativa de execução.

---

## Como Rodar o Projeto via Docker (Ambiente Isolado)

Certifique-se de ter o Docker instalado. Este comando vai subir o PostgreSQL, o Redis e a própria API configurados e conectados de forma automática.

```bash
# 1. Derruba containers antigos, limpa o cache e sobe a aplicação do zero
docker compose down && docker compose build --no-cache && docker compose up
```

Após o término do carregamento:
*   A API estará disponível em: `http://localhost:3000`
*   A Documentação do Swagger estará disponível em: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

---

## Como Rodar o Projeto Localmente

Para rodar a API direto na sua máquina (fora do Docker), você precisará que os bancos de dados estejam ligados em background. Siga os passos na ordem exata:

### Passo Prévia: Ligar o Banco e o Redis via Docker
```bash
docker compose up postgres redis -d
```
*(Garante que o PostgreSQL na porta 5432 e o Redis na porta 6379 estão ativos).*

### Os 4 Comandos de Inicialização Local:

```bash
# 1. Instalar todas as dependências e criar o arquivo package-lock.json
npm install

# 2. Gerar o cliente e os tipos internos do Prisma ORM
npm run prisma:generate

# 3. Criar a pasta de migrações e estruturar as tabelas do banco de dados
npx prisma migrate dev --name init

# 4. Iniciar o servidor local da API em modo de desenvolvimento
npm run dev
```

OBS:

```bash
# 5. Instalar o Vitest e Supertest
npm install --save-dev vitest supertest @types/supertest

# 6. Iniciar os testes
npm run test

# 7. Leitura dos arquivos de modelagem
npx prisma generate
```

Após rodar o quarto comando, o terminal exibirá a mensagem de sucesso e a aplicação estará pronta para receber conexões locais.

---

## Como Rodar os Testes Unitários

Os testes unitários isolam a regra de negócio mockando o banco de dados e as filas do Redis, rodando em poucos milissegundos.

```bash
# Executar todos os testes uma única vez
npm run test

# Executar os testes em modo "Watch" (atualiza sozinho ao alterar arquivos)
npm run test:watch
```
