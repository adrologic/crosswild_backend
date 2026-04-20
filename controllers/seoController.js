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
    const products = await Product.find({ isActive: true }).select('_id slug updatedAt').lean();

    // Get all published blogs
    const blogs = await Blog.find({ isPublished: true }).select('_id slug updatedAt').lean();

    // Get page SEO paths for additional static pages
    const pageSEOEntries = await PageSEO.find({ noIndex: { $ne: true } }).select('pagePath updatedAt').lean();

    // Build sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
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

    // Add pages from PageSEO (skip duplicates already in staticPages)
    const staticUrls = new Set(staticPages.map(p => p.url));
    for (const p of pageSEOEntries) {
      if (staticUrls.has(p.pagePath)) continue;
      const lastmod = p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString();
      sitemap += `  <url>
    <loc>${baseUrl}${p.pagePath}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    }

    // Add product pages — prefer slug over ID
    for (const product of products) {
      const path = product.slug ? `/products/${product.slug}` : `/products/${product._id}`;
      const lastmod = product.updatedAt ? product.updatedAt.toISOString() : new Date().toISOString();
      sitemap += `  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }

    // Add blog pages — prefer slug over ID
    for (const blog of blogs) {
      const path = blog.slug ? `/blog/${blog.slug}` : `/blog/${blog._id}`;
      const lastmod = blog.updatedAt ? blog.updatedAt.toISOString() : new Date().toISOString();
      sitemap += `  <url>
    <loc>${baseUrl}${path}</loc>
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

// ==================== CONTENT SEO (Product / Blog / Category) ====================

// @desc    Get all content items with SEO status
// @route   GET /api/seo/content-items
// @access  Private/Admin
exports.getContentItemsWithSEO = async (req, res) => {
  try {
    const Product  = require('../models/Product');
    const Blog     = require('../models/Blog');
    const Category = require('../models/Category');

    const [products, blogs, categories] = await Promise.all([
      Product.find({ isActive: true }).select('_id name title slug seo image').lean(),
      Blog.find({ isPublished: true }).select('_id title slug seo image').lean(),
      Category.find().select('_id id name seo image').lean(),
    ]);

    const normalise = (items) =>
      items.map((item) => ({
        _id:    item._id,
        name:   item.title || item.name,
        slug:   item.slug  || item.id,
        image:  item.image,
        hasSEO: !!(item.seo?.title && item.seo?.description),
        seo:    item.seo || {},
      }));

    res.json({
      success: true,
      products:   normalise(products),
      blogs:      normalise(blogs),
      categories: normalise(categories),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update SEO for a single product
// @route   PUT /api/seo/product/:id
// @access  Private/Admin
exports.updateProductSEO = async (req, res) => {
  try {
    const Product = require('../models/Product');
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { seo: req.body } },
      { new: true, runValidators: true }
    ).select('name title slug seo');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product SEO updated', product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update SEO for a single blog
// @route   PUT /api/seo/blog/:id
// @access  Private/Admin
exports.updateBlogSEO = async (req, res) => {
  try {
    const Blog = require('../models/Blog');
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { $set: { seo: req.body } },
      { new: true, runValidators: true }
    ).select('title slug seo');
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    res.json({ success: true, message: 'Blog SEO updated', blog });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update SEO for a single category
// @route   PUT /api/seo/category/:id
// @access  Private/Admin
exports.updateCategorySEO = async (req, res) => {
  try {
    const Category = require('../models/Category');
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: { seo: req.body } },
      { new: true, runValidators: true }
    ).select('name id seo');
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: 'Category SEO updated', category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Auto-generate SEO for all content missing it
// @route   POST /api/seo/bulk-generate
// @access  Private/Admin
exports.bulkGenerateSEO = async (req, res) => {
  try {
    const Product  = require('../models/Product');
    const Blog     = require('../models/Blog');
    const Category = require('../models/Category');
    const globalSettings = await GlobalSEO.getSettings();
    const siteName = globalSettings.siteName || 'The CrossWild';

    const missingFilter = {
      $or: [
        { 'seo.title': { $exists: false } },
        { 'seo.title': '' },
        { 'seo.title': null },
      ],
    };

    let productsUpdated = 0, blogsUpdated = 0, categoriesUpdated = 0;

    // --- Products ---
    const products = await Product.find({ isActive: true, ...missingFilter });
    for (const p of products) {
      const name = p.title || p.name;
      await Product.findByIdAndUpdate(p._id, {
        $set: {
          seo: {
            title:       `${name} | Custom Manufacturing | ${siteName}`,
            description: (p.shortDescription || (p.description || '').replace(/<[^>]+>/g, '')).slice(0, 160) ||
                         `Buy ${name} online. Custom manufacturing with bulk pricing. Fast delivery across India.`,
            keywords:    [name, p.category, 'manufacturer', 'custom', 'bulk', 'Jaipur', 'India'].filter(Boolean),
            noIndex:     false,
            noFollow:    false,
          },
        },
      });
      productsUpdated++;
    }

    // --- Blogs ---
    const blogs = await Blog.find({ isPublished: true, ...missingFilter });
    for (const b of blogs) {
      await Blog.findByIdAndUpdate(b._id, {
        $set: {
          seo: {
            title:       `${b.title} | ${siteName} Blog`,
            description: (b.paragraph || '').replace(/<[^>]+>/g, '').slice(0, 160) ||
                         `Read about ${b.title} on The CrossWild blog.`,
            keywords:    [...(b.tags || []), siteName, 'blog'].filter(Boolean),
            noIndex:     false,
            noFollow:    false,
          },
        },
      });
      blogsUpdated++;
    }

    // --- Categories ---
    const categories = await Category.find({ ...missingFilter });
    for (const c of categories) {
      await Category.findByIdAndUpdate(c._id, {
        $set: {
          seo: {
            title:       `${c.name} Manufacturer & Supplier | ${siteName}`,
            description: (c.description || '').slice(0, 160) ||
                         `Buy custom ${c.name} in bulk. Best quality, competitive pricing, fast delivery across India.`,
            keywords:    [c.name, 'manufacturer', 'custom', 'bulk', 'India', siteName].filter(Boolean),
            noIndex:     false,
            noFollow:    false,
          },
        },
      });
      categoriesUpdated++;
    }

    res.json({
      success: true,
      message: `SEO auto-generated — ${productsUpdated} products, ${blogsUpdated} blogs, ${categoriesUpdated} categories updated`,
      updated: { products: productsUpdated, blogs: blogsUpdated, categories: categoriesUpdated },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
