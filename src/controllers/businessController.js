import Business from '../models/Business.js';
import xlsx from 'xlsx';

// @desc    Download Excel template for importing businesses
// @route   GET /api/businesses/import/template
// @access  Public
export const downloadImportTemplate = (req, res) => {
  try {
    // Define the columns expected by the import function
    const templateData = [
      {
        'Place Name': 'Demo Business',
        'Title': 'Demo Business Title',
        'Total Score': 4.5,
        'Reviews Count': 120,
        'Street': '123 Tech Street',
        'City': 'New York',
        'State': 'NY',
        'Country Code': 'US',
        'Website': 'https://demobusiness.com',
        'Email': 'contact@demobusiness.com',
        'Phone': '+1234567890',
        'Categories': 'Software',
        'Map URL': 'https://maps.google.com/...',
        'Category Name': 'Software Development'
      }
    ];

    const worksheet = xlsx.utils.json_to_sheet(templateData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Template');

    // Create a buffer and send it
    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=business_import_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    res.status(200).send(excelBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Import businesses from Excel

// @route   POST /api/businesses/import
// @access  Public
export const importBusinesses = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { niche } = req.body;
    
    // Read the file from buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = xlsx.utils.sheet_to_json(sheet);
    
    if (!data || data.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty' });
    }
    
    const businessesToInsert = data.map((row) => {
      return {
        name: row['Place Name'] || row.name || row.Name || 'Unknown',
        niche: niche || row['Category Name'] || row.Categories || row.niche || row.Niche || '',
        address: row.Street || row.address || row.Address || '',
        email: row.Email || row.email || '',
        phoneNumber: row.Phone || row.phoneNumber || row.phone || '',
        city: row.City || row.city || '',
        state: row.State || row.state || '',
        country: row['Country Code'] || row.country || row.Country || '',
        webUrl: row.Website || row.webUrl || row.website || '',
        isWeb: !!(row.Website || row.webUrl || row.website),
        googleMapsUrl: row['Map URL'] || row.googleMapsUrl || '',
        rating: parseFloat(row['Total Score'] || row.rating) || 0,
        reviewCount: parseInt(row['Reviews Count'] || row.reviewCount, 10) || 0
      };
    });

    const result = await Business.insertMany(businessesToInsert, { ordered: false });

    res.status(201).json({
      success: true,
      message: `Imported ${result.length} businesses successfully`,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new business
// @route   POST /api/businesses
// @access  Public
export const createBusiness = async (req, res) => {
  try {
    const business = await Business.create(req.body);

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
    const { search, startDate, endDate, niche, city, country, isWeb, isSend, issendwhatsapp, issendemail, businessModel, rating, page = 1, limit = 10 } = req.query;
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

    if (businessModel) {
      filter.businessModel = businessModel;
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

    if (issendwhatsapp !== undefined) {
      filter.issendwhatsapp = issendwhatsapp === 'true';
    }

    if (issendemail !== undefined) {
      filter.issendemail = issendemail === 'true';
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    let sort = { createdAt: -1 }; // default sorting
    if (rating === 'high') {
      sort = { rating: -1, reviewCount: -1 };
    }

    const [total, businesses] = await Promise.all([
      Business.countDocuments(filter),
      Business.find(filter).sort(sort).skip(skip).limit(limitNum).lean()
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
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      req.body,
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

// @desc    Send whatsapp
// @route   POST /api/businesses/send-whatsapp
// @access  Public
export const sendWhatsapp = async (req, res) => {
  try {
    const { phoneNumber } = req.query;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required in query' });
    }

    const business = await Business.findOneAndUpdate(
      { phoneNumber },
      { issendwhatsapp: true },
      { new: true }
    );

    if (!business) {
      return res.status(404).json({ message: 'Business not found with this phone number' });
    }

    res.status(200).json({
      success: true,
      message: 'WhatsApp sent status updated successfully',
      data: business
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
