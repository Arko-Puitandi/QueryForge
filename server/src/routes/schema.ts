import { Router } from 'express';
import { validateSchema, exportDiagram } from '../controllers/schemaController';

const router = Router();

// Validate schema for errors and warnings
router.post('/validate', validateSchema);

// Export diagram as PNG/SVG
router.post('/export', exportDiagram);

export default router;
