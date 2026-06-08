# 🚀 API Events B2B - Orquestrador de Eventos

Microserviço escalável projetado para orquestrar e distribuir eventos de parceiros comerciais em alta concorrência.

## 🛠️ Tecnologias Utilizadas
- **Node.js & TypeScript**
- **Express** (API REST)
- **Prisma ORM** & **PostgreSQL** (Persistência e Idempotência)
- **BullMQ** & **Redis** (Filas de Mensageria, Retries, DLQ e Rate Limiting)
- **Zod** (Validação de Schemas)
- **Docker & Docker Compose** (Containerização)

## Como Executar o Projeto com um Único Comando

Certifique-se de ter o **Docker** e o **Docker Compose** instalados na sua máquina.

Execute na raiz do projeto:
```bash
docker-compose up --build
```

O comando irá configurar:
1. O Banco de Dados PostgreSQL na porta `5432`
2. O Redis para filas de processamento na porta `6379`
3. Executará as migrações do banco automaticamente
4. Subirá o servidor da API na porta `3000`

---

## Endpoints da API

### 1. Enviar um Evento (`POST /api/events`)
Garante idempotência pelo ID fornecido. Se o ID já existir, responderá com HTTP `409 Conflict`.
- **Payload:**
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

### 2. Consultar Status do Evento (`GET /api/events/:id`)
Retorna o estado atual do evento (`RECEBIDO`, `PROCESSANDO`, `SUCESSO`, `FALHA`, `DEAD_LETTER`).

### 3. Painel de Estatísticas (`GET /api/events/stats`)
Mostra o totalizador de eventos em tempo real agrupados por status.

### 4. Forçar Reprocessamento da Dead Letter (`POST /api/events/:id/retry`)
Move manualmente um evento em estado de `DEAD_LETTER` de volta para a esteira ativa de execução.

---

## Documentação OpenAPI Swagger
Com a aplicação rodando, acesse os detalhes interativos da API em:
👉 [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
