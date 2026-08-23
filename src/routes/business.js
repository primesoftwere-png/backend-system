import express from 'express';
import {
  createBusiness,
  getBusinesses,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  getNiches,
  getCities,
  getCountries,
} from '../controllers/businessController.js';

const router = express.Router();

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

// Routes for /api/businesses/:id
router.route('/:id')
  .get(getBusinessById)
  .put(updateBusiness)
  .delete(deleteBusiness);

export default router;
