import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

dotenv.config();

// Inicializar workers de background
import './queues/processors/event.processor';

import eventRoutes from './routes/event.routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();

app.use(cors());
app.use(express.json());

const swaggerDocument = {
    openapi: "3.0.0",
    info: { title: "API Events B2B Orchestrator", version: "1.0.0" },
    paths: {
        "/events": {
            post: {
                summary: "Recebe evento de parceiros comerciais",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { type: "object", properties: { id: { type: "string" }, type: { type: "string" }, payload: { type: "object" }, origin: { type: "string" } }, required: ["id", "type", "payload", "origin"] } } }
                },
                responses: { "202": { description: "Aceito" }, "409": { description: "Conflito / Duplicado" } }
            }
        },
        "/events/stats": { get: { summary: "Estatísticas agregadas de processamento", responses: { "200": { description: "OK" } } } },
        "/events/{id}": { get: { summary: "Consulta status do evento", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } } },
        "/events/{id}/retry": { post: { summary: "Reprocessa manualmente evento da Dead Letter", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } } }
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
