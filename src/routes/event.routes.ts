import { Router } from 'express';
import { EventController, eventSchema } from '../controllers/event.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { rateLimiter } from '../middlewares/rate-limiter.middleware';

const router = Router();
const controller = new EventController();

router.post('/events', rateLimiter, validateBody(eventSchema), (req, res) => controller.handle(req, res));
router.get('/events/stats', (req, res) => controller.getStats(req, res));
router.get('/events/:id', (req, res) => controller.getStatus(req, res));
router.post('/events/:id/retry', (req, res) => controller.retry(req, res));

export default router;
