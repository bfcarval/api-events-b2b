import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

dotenv.config();

import './queues/processors/event.processor';

import eventRoutes from './routes/event.routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();

app.use(cors());
app.use(express.json());

const swaggerDocument = {
    openapi: "3.0.0",
    info: {
        title: "Orquestrador de Eventos B2B",
        version: "1.0.0",
        description: "API crítica e de alta concorrência para recebimento, validação, resiliência e distribuição de eventos de parceiros comerciais."
    },
    servers: [
        {
            url: "http://localhost:3000/api",
            description: "Servidor Local de Desenvolvimento"
        }
    ],
    paths: {
        "/events": {
            post: {
                tags: ["Eventos B2B"],
                summary: "Receber novo evento de parceiro",
                description: "Valida o contrato do JSON via Zod e agenda o processamento assíncrono usando filas no Redis. Implementa controle rígido de idempotência pelo ID enviado.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/EventInput" }
                        }
                    }
                },
                responses: {
                    "202": {
                        description: "Evento aceito e adicionado com sucesso na esteira ativa de execução.",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/EventResponse" }
                            }
                        }
                    },
                    "400": {
                        description: "Erro de validação. O payload enviado quebrou o contrato esperado pelo sistema.",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorValidation" }
                            }
                        }
                    },
                    "409": {
                        description: "Conflito de Idempotência. Este ID de evento já foi processado ou está na esteira ativa.",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorConflict" }
                            }
                        }
                    },
                    "429": {
                        description: "Rate Limit Excedido. O parceiro superou o limite de requisições por minuto tolerado pela API."
                    }
                }
            }
        },
        "/events/stats": {
            get: {
                tags: ["Monitoramento & Observabilidade"],
                summary: "Obter métricas consolidadas em tempo real",
                description: "Retorna o totalizador global de todos os eventos guardados no banco de dados, agregados por estado de processamento.",
                responses: {
                    "200": {
                        description: "Estatísticas agregadas localizadas.",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        RECEBIDO: { type: "integer", example: 15 },
                                        PROCESSANDO: { type: "integer", example: 2 },
                                        SUCESSO: { type: "integer", example: 14520 },
                                        FALHA: { type: "integer", example: 12 },
                                        DEAD_LETTER: { type: "integer", example: 1 }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/events/{id}": {
            get: {
                tags: ["Eventos B2B"],
                summary: "Consultar status de um evento específico",
                description: "Retorna o histórico completo, a carga útil enriquecida, número de tentativas de envio e erros associados a um ID de transação.",
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        description: "ID Único do evento fornecido originalmente pelo parceiro comercial",
                        schema: { type: "string", format: "uuid", example: "e29e0618-9366-419b-b0b3-f0fa807ad5d9" }
                    }
                ],
                responses: {
                    "200": {
                        description: "Registro localizado com sucesso.",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/EventResponse" }
                            }
                        }
                    },
                    "404": {
                        description: "Nenhum registro de evento localizado com o ID informado no banco de dados."
                    }
                }
            }
        },
        "/events/{id}/retry": {
            post: {
                tags: ["Resiliência & Filas (DLQ)"],
                summary: "Reprocessar manualmente evento travado na Dead-Letter Queue",
                description: "Puxa uma mensagem que estourou as 3 tentativas e ficou isolada no limbo de erros (`DEAD_LETTER`), zerando as métricas e reinjetando-a na esteira operacional ativa.",
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        description: "ID do evento em estado morto (DEAD_LETTER)",
                        schema: { type: "string", format: "uuid", example: "e29e0618-9366-419b-b0b3-f0fa807ad5d9" }
                    }
                ],
                responses: {
                    "200": {
                        description: "Comando executado. Evento enviado de volta para a fila operacional principal.",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: { type: "string", example: "Evento reenviado para processamento com sucesso." }
                                    }
                                }
                            }
                        }
                    },
                    "400": {
                        description: "Solicitação inválida. O evento não está em estado morto ou não existe no sistema."
                    }
                }
            }
        }
    },
    components: {
        schemas: {
            EventInput: {
                type: "object",
                required: ["id", "type", "payload", "origin"],
                properties: {
                    id: { type: "string", format: "uuid", description: "Identificador idempotente universal (UUID v4)", example: "e29e0618-9366-419b-b0b3-f0fa807ad5d9" },
                    type: { type: "string", enum: ["VENDA", "DEVOLUÇÃO", "ATUALIZAÇÃO_ESTOQUE"], description: "Tipo da transação comercial", example: "VENDA" },
                    origin: { type: "string", description: "Nome ou código de identificação do parceiro emissor", example: "MARKETPLACE_SHOPEE_B2B" },
                    payload: {
                        type: "object",
                        description: "Dados dinâmicos da mensagem comercial em formato JSON puros",
                        example: { total: 2950.00, itens: [{ sku: "NOTE-DELL-I7", quantidade: 1 }] }
                    }
                }
            },
            EventResponse: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid", example: "e29e0618-9366-419b-b0b3-f0fa807ad5d9" },
                    type: { type: "string", example: "VENDA" },
                    origin: { type: "string", example: "MARKETPLACE_SHOPEE_B2B" },
                    status: { type: "string", enum: ["RECEBIDO", "PROCESSANDO", "SUCESSO", "FALHA", "DEAD_LETTER"], example: "RECEBIDO" },
                    attempts: { type: "integer", example: 0, description: "Número atual de tentativas de entrega downstream ocorridas" },
                    errorMessage: { type: "string", nullable: true, example: null, description: "Rastro do erro capturado se a transação falhar" },
                    payload: { type: "object" },
                    createdAt: { type: "string", format: "date-time", example: "2026-06-08T14:40:00.000Z" },
                    updatedAt: { type: "string", format: "date-time", example: "2026-06-08T14:40:00.000Z" }
                }
            },
            ErrorValidation: {
                type: "object",
                properties: {
                    error: { type: "string", example: "Validação falhou" },
                    details: {
                        type: "object",
                        properties: {
                            id: { type: "object", properties: { _errors: { type: "array", items: { type: "string" }, example: ["O ID deve ser um UUID válido."] } } },
                            type: { type: "object", properties: { _errors: { type: "array", items: { type: "string" }, example: ["Invalid enum value. Expected 'VENDA' | 'DEVOLUÇÃO'..."] } } }
                        }
                    }
                }
            },
            ErrorConflict: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Evento já processado anteriormente." },
                    data: { $ref: "#/components/schemas/EventResponse" }
                }
            }
        }
    }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api', eventRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Documentação da API disponível em http://localhost:${PORT}/api-docs`);
});
