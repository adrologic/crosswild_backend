/**
 * SEO Seed Script — migrates exact SEO data from thecrosswild.com
 *
 * Usage:
 *   node seeds/seed-seo.js
 *   MONGODB_URI="..." node seeds/seed-seo.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { PageSEO, GlobalSEO } = require('../models/SEO');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not set.');
  process.exit(1);
}

const OG_IMAGE = 'https://www.thecrosswild.com/assets/front/images/logo.jpg';

const pages = [
  // ── Static pages ─────────────────────────────────────────────────────────
  {
    pagePath: '/',
    title: 'Manufacturers of Custom T-shirts, Bags & Caps in Jaipur, India | The Cross Wild',
    description: 'The Cross Wild is a leading manufacturer of custom T-shirts, personalized bags and hats in Jaipur. With affordable wholesale quantities the best designs free custom artwork & a quick delivery service available for each order.',
    keywords: ['customize corporate apparels', 'promotional products manufacturer', 'promotional products suppliers', 'corporate suppliers', 'promo totes India', 'bulk t-shirts supplier'],
    ogTitle: 'Manufacturers of Custom T-shirts, Bags & Caps in Jaipur, India | The Cross Wild',
    ogDescription: 'The Cross Wild is a leading manufacturer of custom T-shirts, personalized bags and hats in Jaipur. With affordable wholesale quantities the best designs free custom artwork & a quick delivery service available for each order.',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/',
  },
  {
    pagePath: '/about-us',
    title: 'About Us - The Cross Wild',
    description: 'Since 2016, The CrossWild has been a trusted name in custom manufacturing and printing. Specializing in t-shirts, bags, caps, and more, we offer high-quality, affordable promotional products tailored to your needs. Proudly Indian-made, with fast delivery and exceptional customer service.',
    keywords: ['Premium Custom Products & Printing Solutions', 'The CrossWild', 'about thecrosswild'],
    ogTitle: 'About Us - The Cross Wild',
    ogDescription: 'Since 2016, The CrossWild has been a trusted name in custom manufacturing and printing. Specializing in t-shirts, bags, caps, and more, we offer high-quality, affordable promotional products tailored to your needs.',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/about-us',
  },
  {
    pagePath: '/our-process',
    title: 'How the Process at The Cross Wild',
    description: 'Explore high-quality custom hoodies, caps, and apparel tailored to your needs at our Jaipur-based facility. From personalized designs to bulk orders, we specialize in creating top-notch products for businesses, events, and individuals. Experience precision craftsmanship and timely delivery with every order!',
    keywords: ['our process', 'crosswild manufacturing process', 'custom printing process jaipur'],
    ogTitle: 'How the Process at The Cross Wild',
    ogDescription: 'Explore high-quality custom hoodies, caps, and apparel tailored to your needs at our Jaipur-based facility. From personalized designs to bulk orders, we specialize in creating top-notch products for businesses, events, and individuals.',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/our-process',
  },
  {
    pagePath: '/contact-us',
    title: 'Contact The Cross Wild for Inquiries and Support',
    description: 'Have questions or need support? Get in touch with The Cross Wild team today. We\'re here to assist you with any inquiries or requests! Call Now - +91-9529626262',
    keywords: ['Contact The Cross Wild for support', 'contact crosswild', 'crosswild phone number'],
    ogTitle: 'Contact The Cross Wild for Inquiries and Support',
    ogDescription: 'Have questions or need support? Get in touch with The Cross Wild team today. We\'re here to assist you with any inquiries or requests! Call Now - +91-9529626262',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/contact-us',
  },
  {
    pagePath: '/blog',
    title: 'Blogs - The CrossWild',
    description: 'Explore the blog on promotional products for events, business and branding from the Cross Wild',
    keywords: ['blogs', 'crosswild blog', 'promotional products blog', 'custom printing articles'],
    ogTitle: 'Blogs - The CrossWild',
    ogDescription: 'Explore the blog on promotional products for events, business and branding from the Cross Wild',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/blog',
  },
  {
    pagePath: '/image-gallery',
    title: 'Image Gallery - The Cross Wild | Custom Printing Work',
    description: 'Browse our gallery of custom printed t-shirts, bags, caps, mugs and promotional merchandise manufactured at The Cross Wild, Jaipur.',
    keywords: ['image gallery', 'crosswild gallery', 'custom printing samples', 'printed products photos'],
    ogTitle: 'Image Gallery - The Cross Wild',
    ogDescription: 'Browse our gallery of custom printed t-shirts, bags, caps, mugs and promotional merchandise manufactured at The Cross Wild, Jaipur.',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/image-gallery',
  },
  {
    pagePath: '/why-choose-us',
    title: 'Why Choose The Crosswild as a Trusted Partner for Custom Printing & Quality Craftsmanship',
    description: 'The Crosswild combines quality, affordability, and passion in custom printing. Experience superior service, competitive pricing, and designs tailored to your needs.',
    keywords: ['Why Choose Us', 'why crosswild', 'best custom printing company jaipur'],
    ogTitle: 'Why Choose The Crosswild as a Trusted Partner for Custom Printing & Quality Craftsmanship',
    ogDescription: 'The Crosswild combines quality, affordability, and passion in custom printing. Experience superior service, competitive pricing, and designs tailored to your needs.',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/why-choose-us',
  },

  // ── Location pages (new site uses /locations/[slug]) ─────────────────────
  {
    pagePath: '/locations/jodhpur',
    title: 'T-Shirt Manufacturers and Printing in Jodhpur - The Cross Wild',
    description: 'Prices start at just Rs. 70. Crosswild is a leading T-shirt manufacturing and supplier company in Jodhpur. We customise and print T-shirts for schools, colleges, events, and promotions at affordable prices.',
    keywords: ['T Shirts', 'Tee Shirt', 'manufacturers', 'suppliers', 'exporters', 'traders', 'dealers', 'manufacturing companies', 'retailers', 'producers'],
    ogTitle: 'T-Shirt Manufacturers and Printing in Jodhpur - The Cross Wild',
    ogDescription: 'Prices start at just Rs. 70. Crosswild is a leading T-shirt manufacturing and supplier company in Jodhpur.',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/tshirt-manufacturer-in-jodhpur',
  },
  {
    pagePath: '/locations/indore',
    title: 'Promotional Corporate T-shirt Manufacturers in Indore',
    description: 'The Cross Wild is a leading manufacturer of customized T-shirts for corporate in Indore for advertising events, sports etc. at affordable prices. Call Now',
    keywords: ['T-shirt Manufacturing in Indore', 'corporate t-shirt indore', 'custom t-shirt indore'],
    ogTitle: 'Promotional Corporate T-shirt Manufacturers in Indore',
    ogDescription: 'The Cross Wild is a leading manufacturer of customized T-shirts for corporate in Indore for advertising events, sports etc. at affordable prices.',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/tshirt-manufacturer-in-indore',
  },
  {
    pagePath: '/locations/udaipur',
    title: 'T-Shirt Manufacturer and Wholesaler in Udaipur - The Crosswild',
    description: 'Prices start @ Rs 70 only. The Crosswild is a leading t-shirt manufacturer and supplier company in Udaipur, Rajasthan. We manufacture customize t-shirts for schools, colleges, events, and promotions at wholesale price.',
    keywords: ['T Shirts', 'Tee Shirt', 'manufacturers', 'wholesaler', 'suppliers', 'exporters', 'traders', 'dealers', 'manufacturing companies'],
    ogTitle: 'T-Shirt Manufacturer and Wholesaler in Udaipur - The Crosswild',
    ogDescription: 'Prices start @ Rs 70 only. The Crosswild is a leading t-shirt manufacturer and supplier company in Udaipur, Rajasthan.',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/tshirt-manufacturer-wholesaler-in-udaipur',
  },
  {
    pagePath: '/locations/jaipur',
    title: 'Customize, Promotional T-shirt Manufacturer and Printing in Jaipur - The Crosswild',
    description: 'The crosswild is the reputed & leading firm in the field of manufacturer & printing of all types of customize, promotional T-shirts in Jaipur for more info call 9529626262',
    keywords: ['t-shirt manufacturer in jaipur', 't-shirt printing in Jaipur', 't-shirt printer in jaipur', 'customize t-shirt in jaipur', 'promotional t-shirt in jaipur', 'tshirt manufacturing company in jaipur', 't-shirts at a wholesale price', 'bulk t-shirt manufacturing'],
    ogTitle: 'Customize, Promotional T-shirt Manufacturer and Printing in Jaipur - The Crosswild',
    ogDescription: 'The crosswild is the reputed & leading firm in the field of manufacturer & printing of all types of customize, promotional T-shirts in Jaipur.',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/product/customize-promotional-t-shirt-manufacturer-in-Jaipur',
  },

  // ── Product / Category pages ──────────────────────────────────────────────
  {
    pagePath: '/categories/t-shirts',
    title: 'Customize, Promotional T-shirt Manufacturer and Printing in Jaipur - The Crosswild',
    description: 'The crosswild is the reputed & leading firm in the field of manufacturer & printing of all types of customize, promotional T-shirts in Jaipur for more info call 9529626262',
    keywords: ['t-shirt manufacturer in jaipur', 't-shirt printing in Jaipur', 't-shirt printer in jaipur', 'customize t-shirt in jaipur', 'promotional t-shirt in jaipur', 'tshirt manufacturing company in jaipur', 't-shirts at a wholesale price', 'bulk t-shirt manufacturing'],
    ogTitle: 'Customize, Promotional T-shirt Manufacturer and Printing in Jaipur - The Crosswild',
    ogDescription: 'The crosswild is the reputed & leading firm in the field of manufacturer & printing of all types of customize, promotional T-shirts in Jaipur.',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/product/customize-promotional-t-shirt-manufacturer-in-Jaipur',
  },
  {
    pagePath: '/categories/sweatshirts-hoodies',
    title: 'Best Sweatshirt, Hoodie Manufacturer and Printer in Jaipur',
    description: 'The crosswild are recognized as the foremost Manufacturer and designing of a wide range of sweatshirt and hoodie in Jaipur at best price. Call 9571815050',
    keywords: ['sweatshirt manufacturer in Jaipur', 'hoodie manufacturer in Jaipur', 'sweatshirt printer in Jaipur'],
    ogTitle: 'Best Sweatshirt, Hoodie Manufacturer and Printer in Jaipur',
    ogDescription: 'The crosswild are recognized as the foremost Manufacturer and designing of a wide range of sweatshirt and hoodie in Jaipur at best price.',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/product/sweatshirt-hoodie-manufacturer-in-Jaipur',
  },
  {
    pagePath: '/categories/bags',
    title: 'Best Food Delivery, School, Office Bags Manufacturer in Jaipur - The CrossWild',
    description: 'The Crosswild is the largest bag manufacturer in Jaipur. We specialize in manufacturing school, laptop, corporate, food delivery backpacks/bags etc. at the best price. Call 9571815050.',
    keywords: ['bag manufacturer in Jaipur', 'food delivery bags', 'bags supplier in jaipur', 'bag manufacturing company in Jaipur'],
    ogTitle: 'Best Food Delivery, School, Office Bags Manufacturer in Jaipur - The CrossWild',
    ogDescription: 'The Crosswild is the largest bag manufacturer in Jaipur. We specialize in manufacturing school, laptop, corporate, food delivery backpacks/bags etc.',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/product/school-laptop-bag-manufacturer-in-Jaipur',
  },
  {
    pagePath: '/categories/caps',
    title: 'Caps Printing, Manufacturer in Jaipur, India | Customized & Promotional Caps - The CrossWild',
    description: 'The CrossWild is well reputed customized & promotional caps printing & printing manufacturer in Jaipur, India. We are manufacturer of corporate, sports, tourist caps call +91-9529626262.',
    keywords: ['cap printing in jaipur', 'cap manufacturer in jaipur', 'customized caps', 'promotional caps'],
    ogTitle: 'Caps Printing, Manufacturer in Jaipur, India | Customized & Promotional Caps - The CrossWild',
    ogDescription: 'The CrossWild is well reputed customized & promotional caps printing & printing manufacturer in Jaipur, India.',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/product/cap-printing-manufacturer-in-jaipur',
  },
  {
    pagePath: '/categories/mugs',
    title: 'Personalized Custom Mug Printing in Jaipur, India - The Crosswild',
    description: 'The Crosswild is one of the leading firm providing mug printing services and all types of personalized custom mug printing at best price in Jaipur. For more details call on +91-9529626262',
    keywords: ['mug printing in jaipur', 'mug printer in jaipur', 'custom mug printing service'],
    ogTitle: 'Personalized Custom Mug Printing in Jaipur, India - The Crosswild',
    ogDescription: 'The Crosswild is one of the leading firm providing mug printing services and all types of personalized custom mug printing at best price in Jaipur.',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/product/mug-printing-in-Jaipur',
  },
  {
    pagePath: '/categories/printing',
    title: 'Digital, Rubber, Screen Printing Services in Jaipur, India - The Cross Wild',
    description: 'Cross Wild is a leading commercial printing service provider company in Jaipur, India, specializing in digital, screen, and rubber printing on t-shirts at the best prices.',
    keywords: ['digital printing in jaipur', 'screen printing in jaipur', 'rubber printing in jaipur'],
    ogTitle: 'Digital, Rubber, Screen Printing Services in Jaipur, India - The Cross Wild',
    ogDescription: 'Cross Wild is a leading commercial printing service provider company in Jaipur, India, specializing in digital, screen, and rubber printing on t-shirts.',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/product/printing',
  },
  {
    pagePath: '/categories/school-uniforms',
    title: 'Customized School Dress | School Uniform Manufacturer In Jaipur India',
    description: 'Find the best school uniform manufacturer in Jaipur for your dress customization needs. Crosswild provides school uniform manufacturers and promotional printing services at wholesaler prices. For bulk orders call 9529626262.',
    keywords: ['School Uniform Manufacturers Jaipur', 'Sport T Shirt Manufacturers In Jaipur', 'Teacher Uniform Manufacturers In Jaipur', 'Customized School dress manufactuers', 'Girls School dress manufacturers', 'Boys School dress manufacturers'],
    ogTitle: 'Customized School Dress | School Uniform Manufacturer In Jaipur India',
    ogDescription: 'Find the best school uniform manufacturer in Jaipur for your dress customization needs. Crosswild provides school uniform manufacturers and promotional printing services at wholesaler prices.',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/product/school-uniform',
  },
  {
    pagePath: '/categories/staff-uniforms',
    title: 'Uniform Manufacturer, Supplier for Office Employees and Healthcare Workers in Jaipur',
    description: 'The Crosswild offers a wide range of healthcare, industrial workshop and office staff uniforms with customization and branding in Jaipur. Call 9529626262 for bulk orders.',
    keywords: ['uniform for office staff in Jaipur', 'doctors uniform manufacturer in Jaipur', 'employee uniform supplier'],
    ogTitle: 'Uniform Manufacturer, Supplier for Office Employees and Healthcare Workers in Jaipur',
    ogDescription: 'The Crosswild offers a wide range of healthcare, industrial workshop and office staff uniforms with customization and branding in Jaipur.',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/product/staff-uniform-manufacturer',
  },

  // ── Products listing page ─────────────────────────────────────────────────
  {
    pagePath: '/products',
    title: 'All Products - Custom T-shirts, Bags, Caps & More | The Cross Wild',
    description: 'Browse all custom printed products at The Cross Wild — T-shirts, sweatshirts, bags, caps, mugs, uniforms and more. Bulk orders available with fast delivery across India.',
    keywords: ['custom products jaipur', 'promotional merchandise', 'bulk printing india', 'custom t-shirts bags caps'],
    ogTitle: 'All Products - Custom T-shirts, Bags, Caps & More | The Cross Wild',
    ogDescription: 'Browse all custom printed products at The Cross Wild — T-shirts, sweatshirts, bags, caps, mugs, uniforms and more.',
    ogImage: OG_IMAGE,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.thecrosswild.com/products',
  },
];

const globalSettings = {
  siteName: 'The Cross Wild',
  siteUrl: 'https://www.thecrosswild.com',
  defaultTitle: 'Manufacturers of Custom T-shirts, Bags & Caps in Jaipur, India | The Cross Wild',
  titleTemplate: '%s | The Cross Wild',
  defaultDescription: 'The Cross Wild is a leading manufacturer of custom T-shirts, personalized bags and hats in Jaipur. With affordable wholesale quantities the best designs free custom artwork & a quick delivery service available for each order.',
  defaultKeywords: [
    'custom t-shirt manufacturer jaipur',
    'promotional products manufacturer',
    'customize corporate apparels',
    'bulk t-shirts supplier',
    'promotional products suppliers',
    'corporate suppliers',
    'promo totes India',
    'custom printing jaipur',
  ],
  defaultOgImage: OG_IMAGE,
  googleTagManagerId: 'GTM-MFGN4PGT',
  socialLinks: {
    whatsapp: '+91-9571815050',
  },
  contactInfo: {
    phone: '+91-9571815050',
    email: 'orders@thecrosswild.com',
    address: {
      street: 'Jaipur',
      city: 'Jaipur',
      state: 'Rajasthan',
      postalCode: '302001',
      country: 'IN',
    },
  },
  organizationSchema: {
    type: 'Organization',
    name: 'The Cross Wild',
    logo: OG_IMAGE,
    description: 'Leading manufacturer of custom T-shirts, personalized bags, caps and promotional merchandise in Jaipur, India since 2016.',
  },
  localBusiness: {
    telephone: '+91-9571815050',
    email: 'orders@thecrosswild.com',
    address: {
      street: 'Jaipur',
      city: 'Jaipur',
      state: 'Rajasthan',
      postalCode: '302001',
      country: 'IN',
    },
    openingHours: 'Mo-Sa 09:00-18:00',
    priceRange: '₹₹',
  },
  robotsTxt: `User-agent: *\nAllow: /\n\nSitemap: https://www.thecrosswild.com/sitemap.xml`,
};

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  let upserted = 0;
  let errors = 0;

  for (const page of pages) {
    try {
      await PageSEO.findOneAndUpdate(
        { pagePath: page.pagePath },
        { $set: page },
        { upsert: true, new: true, runValidators: true }
      );
      console.log(`  ✓ ${page.pagePath}`);
      upserted++;
    } catch (err) {
      console.error(`  ✗ ${page.pagePath}: ${err.message}`);
      errors++;
    }
  }

  // Upsert global settings
  try {
    const existing = await GlobalSEO.findOne();
    if (existing) {
      await GlobalSEO.findByIdAndUpdate(existing._id, { $set: globalSettings }, { runValidators: true });
    } else {
      await GlobalSEO.create(globalSettings);
    }
    console.log('  ✓ GlobalSEO settings saved');
  } catch (err) {
    console.error(`  ✗ GlobalSEO: ${err.message}`);
    errors++;
  }

  console.log(`\n📊 Done — ${upserted}/${pages.length} pages seeded, ${errors} errors`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
