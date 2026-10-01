import express from 'express';
import multer from 'multer';
import {
  createBusiness,
  getBusinesses,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  getNiches,
  getCities,
  getCountries,
  importBusinesses,
  downloadImportTemplate,
  sendWhatsapp,
} from '../controllers/businessController.js';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Routes for /api/businesses/import/template
router.route('/import/template')
  .get(downloadImportTemplate);

// Routes for /api/businesses/import
router.route('/import')
  .post(upload.single('file'), importBusinesses);

// Routes for /api/businesses/niches
router.route('/niches')
  .get(getNiches);

// Routes for /api/businesses/cities
router.route('/cities')
  .get(getCities);

// Routes for /api/businesses/countries
router.route('/countries')
  .get(getCountries);

// Routes for /api/businesses
router.route('/')
  .post(createBusiness)
  .get(getBusinesses);

// Routes for /api/businesses/send-whatsapp
router.route('/send-whatsapp')
  .post(sendWhatsapp);

// Routes for /api/businesses/:id
router.route('/:id')
  .get(getBusinessById)
  .put(updateBusiness)
  .delete(deleteBusiness);

export default router;
