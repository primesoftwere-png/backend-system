import Business from '../models/Business.js';

// @desc    Create a new business
// @route   POST /api/businesses
// @access  Public
export const createBusiness = async (req, res) => {
  try {
    const { name, niche, address, email, phoneNumber, isSend, isWeb, webUrl, city, country } = req.body;

    const business = await Business.create({
      name,
      niche,
      address,
      email,
      phoneNumber,
      isSend,
      isWeb,
      webUrl,
      city,
      country,
    });

    res.status(201).json(business);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all businesses
// @route   GET /api/businesses
// @access  Public
export const getBusinesses = async (req, res) => {
  try {
    const { search, startDate, endDate, niche, city, country, isWeb, isSend, page = 1, limit = 10 } = req.query;
    let filter = {};

    if (search) {
      // Escape special characters to prevent regex errors and ReDoS
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { phoneNumber: { $regex: safeSearch, $options: 'i' } },
        { address: { $regex: safeSearch, $options: 'i' } },
        { city: { $regex: safeSearch, $options: 'i' } },
        { country: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          filter.createdAt.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          // Set to the end of the day to include all records on this date
          end.setUTCHours(23, 59, 59, 999);
          filter.createdAt.$lte = end;
        }
      }
      // If neither was valid, remove the createdAt filter to avoid mongoose errors
      if (Object.keys(filter.createdAt).length === 0) {
        delete filter.createdAt;
      }
    }

    if (niche) {
      filter.niche = niche;
    }

    if (city) {
      filter.city = city;
    }

    if (country) {
      filter.country = country;
    }

    if (isWeb !== undefined) {
      filter.isWeb = isWeb === 'true';
    }

    if (isSend !== undefined) {
      filter.isSend = isSend === 'true';
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, businesses] = await Promise.all([
      Business.countDocuments(filter),
      Business.find(filter).skip(skip).limit(limitNum).lean()
    ]);

    res.status(200).json({
      success: true,
      data: businesses,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all unique niches
// @route   GET /api/businesses/niches
// @access  Public
export const getNiches = async (req, res) => {
  try {
    const niches = await Business.distinct('niche', { niche: { $nin: [null, ""] } });
    res.status(200).json({
      success: true,
      data: niches
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all unique cities
// @route   GET /api/businesses/cities
// @access  Public
export const getCities = async (req, res) => {
  try {
    const cities = await Business.distinct('city', { city: { $nin: [null, ""] } });
    res.status(200).json({
      success: true,
      data: cities
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all unique countries
// @route   GET /api/businesses/countries
// @access  Public
export const getCountries = async (req, res) => {
  try {
    const countries = await Business.distinct('country', { country: { $nin: [null, ""] } });
    res.status(200).json({
      success: true,
      data: countries
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single business by ID
// @route   GET /api/businesses/:id
// @access  Public
export const getBusinessById = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id).lean();
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }
    res.status(200).json(business);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a business
// @route   PUT /api/businesses/:id
// @access  Public
export const updateBusiness = async (req, res) => {
  try {
    const { name, niche, address, email, phoneNumber, isSend, isWeb, webUrl, city, country } = req.body;

    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { name, niche, address, email, phoneNumber, isSend, isWeb, webUrl, city, country },
      { new: true, runValidators: true } // new: true returns the updated document
    );
    
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }
    
    res.status(200).json(business);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a business
// @route   DELETE /api/businesses/:id
// @access  Public
export const deleteBusiness = async (req, res) => {
  try {
    const business = await Business.findByIdAndDelete(req.params.id);
    
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }
    
    res.status(200).json({ message: 'Business removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
