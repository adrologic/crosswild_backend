const { PageSEO, GlobalSEO } = require('../models/SEO');

// ==================== GLOBAL SEO ====================

// @desc    Get global SEO settings
// @route   GET /api/seo/global
// @access  Public
exports.getGlobalSEO = async (req, res) => {
  try {
    const settings = await GlobalSEO.getSettings();
    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update global SEO settings
// @route   PUT /api/seo/global
// @access  Private/Admin
exports.updateGlobalSEO = async (req, res) => {
  try {
    let settings = await GlobalSEO.findOne();

    if (!settings) {
      settings = await GlobalSEO.create(req.body);
    } else {
      settings = await GlobalSEO.findByIdAndUpdate(
        settings._id,
        req.body,
        { new: true, runValidators: true }
      );
    }

    res.json({
      success: true,
      message: 'Global SEO settings updated successfully',
      settings,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ==================== PAGE SEO ====================

// @desc    Get all page SEO settings
// @route   GET /api/seo/pages
// @access  Public
exports.getAllPageSEO = async (req, res) => {
  try {
    const pages = await PageSEO.find().sort({ pagePath: 1 });
    res.json({
      success: true,
      pages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get SEO for a specific page
// @route   GET /api/seo/pages/:path
// @access  Public
exports.getPageSEO = async (req, res) => {
  try {
    // Decode the URL path parameter
    const pagePath = decodeURIComponent(req.params.path);

    const page = await PageSEO.findOne({ pagePath });

    if (!page) {
      // Return global defaults if page-specific SEO not found
      const globalSettings = await GlobalSEO.getSettings();
      return res.json({
        success: true,
        page: null,
        useGlobalDefaults: true,
        globalSettings: {
          title: globalSettings.defaultTitle,
          description: globalSettings.defaultDescription,
          keywords: globalSettings.defaultKeywords,
          ogImage: globalSettings.defaultOgImage,
        },
      });
    }

    res.json({
      success: true,
      page,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create or update page SEO
// @route   POST /api/seo/pages
// @access  Private/Admin
exports.createOrUpdatePageSEO = async (req, res) => {
  try {
    const { pagePath, ...seoData } = req.body;

    if (!pagePath) {
      return res.status(400).json({
        success: false,
        message: 'Page path is required',
      });
    }

    let page = await PageSEO.findOne({ pagePath });

    if (page) {
      // Update existing
      page = await PageSEO.findByIdAndUpdate(
        page._id,
        { ...seoData, pagePath },
        { new: true, runValidators: true }
      );
    } else {
      // Create new
      page = await PageSEO.create({ pagePath, ...seoData });
    }

    res.json({
      success: true,
      message: `SEO settings for "${pagePath}" saved successfully`,
      page,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete page SEO
// @route   DELETE /api/seo/pages/:id
// @access  Private/Admin
exports.deletePageSEO = async (req, res) => {
  try {
    const page = await PageSEO.findById(req.params.id);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page SEO settings not found',
      });
    }

    await page.deleteOne();

    res.json({
      success: true,
      message: 'Page SEO settings deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== SITEMAP ====================

// @desc    Generate sitemap XML
// @route   GET /api/seo/sitemap.xml
// @access  Public
exports.generateSitemap = async (req, res) => {
  try {
    const Product = require('../models/Product');
    const Blog = require('../models/Blog');
    const globalSettings = await GlobalSEO.getSettings();

    const baseUrl = globalSettings.siteUrl || 'https://thecrosswild.com';

    // Static pages
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/products', priority: '0.9', changefreq: 'daily' },
      { url: '/blog', priority: '0.8', changefreq: 'weekly' },
      { url: '/about', priority: '0.7', changefreq: 'monthly' },
      { url: '/contact', priority: '0.7', changefreq: 'monthly' },
    ];

    // Get all active products
    const products = await Product.find({ isActive: true }).select('_id updatedAt');

    // Get all published blogs
    const blogs = await Blog.find({ isPublished: true }).select('_id updatedAt');

    // Build sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Add static pages
    for (const page of staticPages) {
      sitemap += `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Add product pages
    for (const product of products) {
      const lastmod = product.updatedAt ? product.updatedAt.toISOString() : new Date().toISOString();
      sitemap += `  <url>
    <loc>${baseUrl}/products/${product._id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }

    // Add blog pages
    for (const blog of blogs) {
      const lastmod = blog.updatedAt ? blog.updatedAt.toISOString() : new Date().toISOString();
      sitemap += `  <url>
    <loc>${baseUrl}/blog/${blog._id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    }

    sitemap += `</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== ROBOTS.TXT ====================

// @desc    Get robots.txt content
// @route   GET /api/seo/robots.txt
// @access  Public
exports.getRobotsTxt = async (req, res) => {
  try {
    const globalSettings = await GlobalSEO.getSettings();
    res.set('Content-Type', 'text/plain');
    res.send(globalSettings.robotsTxt || `User-agent: *
Allow: /

Sitemap: ${globalSettings.siteUrl}/sitemap.xml`);
  } catch (error) {
    res.status(500).send('User-agent: *\nAllow: /');
  }
};

// ==================== SEO SCHEMAS ====================

// @desc    Get LocalBusiness and FAQ schema data
// @route   GET /api/seo/schemas
// @access  Public
exports.getSEOSchemas = async (req, res) => {
  try {
    const settings = await GlobalSEO.getSettings();
    res.json({
      success: true,
      localBusiness: settings.localBusiness || null,
      faqItems: settings.faqItems || [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update LocalBusiness and FAQ schema data
// @route   PUT /api/seo/schemas
// @access  Private/Admin
exports.updateSEOSchemas = async (req, res) => {
  try {
    const { localBusiness, faqItems } = req.body;
    let settings = await GlobalSEO.findOne();

    if (!settings) {
      settings = await GlobalSEO.create({ localBusiness, faqItems });
    } else {
      const updateData = {};
      if (localBusiness !== undefined) updateData.localBusiness = localBusiness;
      if (faqItems !== undefined) updateData.faqItems = faqItems;

      settings = await GlobalSEO.findByIdAndUpdate(
        settings._id,
        updateData,
        { new: true, runValidators: true }
      );
    }

    res.json({
      success: true,
      message: 'SEO schemas updated successfully',
      localBusiness: settings.localBusiness,
      faqItems: settings.faqItems,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ==================== SEO STATS ====================

// @desc    Get SEO overview stats
// @route   GET /api/seo/stats
// @access  Private/Admin
exports.getSEOStats = async (req, res) => {
  try {
    const Product = require('../models/Product');
    const Blog = require('../models/Blog');

    const totalPages = await PageSEO.countDocuments();
    const pagesWithSEO = await PageSEO.countDocuments({
      title: { $exists: true, $ne: '' },
      description: { $exists: true, $ne: '' },
    });

    // Check products with SEO data
    const totalProducts = await Product.countDocuments({ isActive: true });
    const productsWithSEO = await Product.countDocuments({
      isActive: true,
      'seo.title': { $exists: true, $ne: '' },
    });

    // Check blogs with SEO data
    const totalBlogs = await Blog.countDocuments({ isPublished: true });
    const blogsWithSEO = await Blog.countDocuments({
      isPublished: true,
      'seo.title': { $exists: true, $ne: '' },
    });

    const globalSettings = await GlobalSEO.getSettings();
    const hasGoogleAnalytics = !!globalSettings.googleAnalyticsId;
    const hasGTM = !!globalSettings.googleTagManagerId;
    const hasFacebookPixel = !!globalSettings.facebookPixelId;

    res.json({
      success: true,
      stats: {
        pages: {
          total: totalPages,
          withSEO: pagesWithSEO,
        },
        products: {
          total: totalProducts,
          withSEO: productsWithSEO,
        },
        blogs: {
          total: totalBlogs,
          withSEO: blogsWithSEO,
        },
        tracking: {
          googleAnalytics: hasGoogleAnalytics,
          googleTagManager: hasGTM,
          facebookPixel: hasFacebookPixel,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
