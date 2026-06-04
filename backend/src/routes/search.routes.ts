import { Router } from 'express';
import SearchController from '../controllers/search.controller';
import { protect } from '../middlewares/auth';
import { aiGenerationLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.use(protect);

router.post('/query', aiGenerationLimiter, SearchController.search);
router.get('/suggestions', SearchController.suggestions);
router.get('/history', SearchController.getHistory);
router.delete('/history', SearchController.clearHistory);

export default router;
