/**
 * seed-cms.js — Idempotent seed for the new content-editability CMS entities.
 *
 * Run:  node seeds/seed-cms.js
 *
 * Seeds:
 *   - SiteSettings (singleton)
 *   - Menus  (header-primary, header-mobile, footer-services, footer-quick-links, footer-bottom)
 *   - PolicyPages (privacy-policy, disclaimer)
 *   - Testimonials  — INTENTIONALLY EMPTY (template placeholders dropped)
 *   - Brands        — INTENTIONALLY EMPTY (template placeholders dropped)
 *   - Deals
 *   - HomeCapabilities
 *   - HomeWhyChoose
 *   - HomeProductHighlights
 *   - CategoryHomeCards
 *   - ProcessSteps
 *   - ServiceCards
 *   - WhyChooseReasons
 *   - SizeChart  (default)
 *
 * Each upsert skips if the same record already exists, so it is safe to re-run.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const SiteSettings = require('../models/SiteSettings');
const Menu = require('../models/Menu');
const PolicyPage = require('../models/PolicyPage');
const Deal = require('../models/Deal');
const HomeCapability = require('../models/HomeCapability');
const HomeWhyChoose = require('../models/HomeWhyChoose');
const HomeProductHighlight = require('../models/HomeProductHighlight');
const CategoryHomeCard = require('../models/CategoryHomeCard');
const ProcessStep = require('../models/ProcessStep');
const ServiceCard = require('../models/ServiceCard');
const WhyChooseReason = require('../models/WhyChooseReason');
const SizeChart = require('../models/SizeChart');

async function seedSiteSettings() {
  const data = {
    key: 'default',
    header: {
      logo: '/images/logo/logo-crosswile.jpg',
      logoAlt: 'The CrossWild',
      // The header L351 placeholder phone `+91 98765 43210` and DealsSection L107
      // `+919876543210` are not real. Use the real primary phone instead.
      topBarPhone: '+91-9529626262',
      topBarEmail: 'info@thecrosswild.com',
      topBarLinks: [
        { label: 'Services', href: '/services', order: 0 },
        { label: 'How It Works', href: '/our_process', order: 1 },
        { label: 'About Us', href: '/about-us', order: 2 },
        { label: 'Contact Us', href: '/contact-us', order: 3 },
        { label: 'Blog', href: '/blog', order: 4 },
        { label: 'Gallery', href: '/image-gallery', order: 5 },
      ],
      navLinks: [
        { label: 'All Products', href: '/products', order: 0, children: [] },
      ],
      promoTicker: [
        'Get 20% OFF on Bulk Orders! BULK20',
        'Free Delivery on Orders Above ₹999',
        'Custom T-Shirts Starting ₹199',
        'Premium Quality Printing & Merchandise',
        'Pan India Fast Delivery',
        'Uniforms, Gifts & Promotional Items',
      ],
      customizeCTA: {
        label: 'Customize',
        whatsappUrl: 'https://wa.me/919529626262?text=Hello%2C%20I%20want%20to%20create%20a%20custom%20product.',
        emailMailto: 'mailto:info@thecrosswild.com?subject=Custom%20Product%20Inquiry&body=Hello%2C%20I%20want%20to%20create%20a%20custom%20product.%20Please%20share%20the%20details.',
      },
    },
    footer: {
      logo: '/images/logo/logo-crosswile.jpg',
      companyDescription:
        "India's leading custom printing and merchandise company. We bring your brand to life with premium quality products and exceptional service.",
      // Year is rendered dynamically by the footer; this string is the suffix.
      copyrightText: 'The CrossWild. All rights reserved.',
      bottomLinks: [
        { label: 'Privacy Policy', href: '/privacy-policy', order: 0 },
        { label: 'Terms of Service', href: '#', order: 1 },
        { label: 'Cookie Policy', href: '#', order: 2 },
      ],
      servicesLinks: [
        { label: 'T-Shirt Manufacturing', href: '/product/customize-promotional-t-shirt-manufacturer-in-Jaipur', order: 0 },
        { label: 'Sweatshirt Manufacturing', href: '/product/sweatshirt-hoodie-manufacturer-in-Jaipur', order: 1 },
        { label: 'Bag Manufacturer', href: '/product/school-laptop-bag-manufacturer-in-Jaipur', order: 2 },
        { label: 'Cap Manufacturer', href: '/product/cap-printing-manufacturer-in-jaipur', order: 3 },
        { label: 'Mug Printing', href: '/product/mug-printing-in-Jaipur', order: 4 },
        { label: 'Digital Printing', href: '/product/printing', order: 5 },
        { label: 'Face Masks & PPE Kits', href: '/product/face-mask-and-ppe-kit-manufacturer-jaipur', order: 6 },
        { label: 'Sanitizer & Infrared Thermometer', href: '/product/sanitizer-and-infrared-thermometer-wholesaler-jaipur', order: 7 },
        { label: 'School Uniform', href: '/product/school-uniform', order: 8 },
        { label: 'Staff Uniform', href: '/product/staff-uniform-manufacturer', order: 9 },
      ],
      quickLinks: [
        { label: 'Home', href: '/', order: 0 },
        { label: 'About Us', href: '/about-us', order: 1 },
        { label: 'Our Process', href: '/our_process', order: 2 },
        { label: 'Blog', href: '/blog', order: 3 },
        { label: 'Our Gallery', href: '/image-gallery', order: 4 },
        { label: 'Contact Us', href: '/contact-us', order: 5 },
        { label: 'Why Choose Us', href: '/why-choose-us', order: 6 },
        { label: 'Privacy Policy', href: '/privacy-policy', order: 7 },
        { label: 'Disclaimer', href: '/disclaimer', order: 8 },
      ],
      newsletter: {
        enabled: true,
        heading: 'Get Exclusive Deals & Updates',
        subheading: 'Subscribe to our newsletter for special offers and tips',
        placeholder: 'Enter your email',
        buttonLabel: 'Subscribe',
      },
      branchOffices: [
        {
          city: 'Jaipur',
          address: 'D-8, Near World Trade Park, Malviya Nagar, Jaipur, Rajasthan',
          phone: '+91-9571815050',
          hours: 'Mon–Sat: 9:00 AM – 6:00 PM',
          email: 'orders@thecrosswild.com',
          order: 0,
        },
        {
          city: 'Jodhpur',
          address: 'B-13, Shastri Nagar, Near Shastri Circle, Jodhpur',
          phone: '+91-9571286262',
          hours: 'Mon–Sat: 9:00 AM – 6:00 PM',
          email: 'orders@thecrosswild.com',
          order: 1,
        },
        {
          city: 'Indore',
          address: '401, 4th Floor, Near Sky Corporate Tower, Scheme No 78, AB Road, Vijay Nagar, Indore, MP',
          phone: '+91-9649715050',
          hours: 'Mon–Sat: 9:00 AM – 6:00 PM',
          email: 'orders@thecrosswild.com',
          order: 2,
        },
      ],
    },
    contact: {
      primaryPhone: '+91-9529626262',
      secondaryPhones: ['+91-9571815050', '+91-9571286262', '+91-9649715050'],
      primaryEmail: 'orders@thecrosswild.com',
      secondaryEmails: ['info@thecrosswild.com'],
      whatsappNumber: '+919529626262',
      whatsappPrefilledMessage: 'Hello, I want to place a bulk order.',
      address: {
        street: 'D-8, Near World Trade Park, Malviya Nagar',
        city: 'Jaipur',
        state: 'Rajasthan',
        postalCode: '302017',
        country: 'India',
        geo: { lat: 26.8517696, lng: 75.8062041 },
      },
    },
    social: {
      facebook: 'https://www.facebook.com/thecrosswild/',
      twitter: 'https://twitter.com/thecrosswild',
      instagram: 'https://www.instagram.com/thecrosswildcompany/',
      linkedin: '',
      youtube: 'https://www.youtube.com/channel/UCiMxyFkSTrGDq_v9mRYwEZw',
      pinterest: 'https://in.pinterest.com/thecrosswildcompany/',
      whatsapp: 'https://wa.me/919529626262',
    },
    floatingButtons: {
      call: { enabled: true, phone: '+919529626262', ariaLabel: 'Call us at +91 95296 26262' },
      whatsapp: { enabled: true, url: 'https://wa.me/919529626262', ariaLabel: 'Chat with us on WhatsApp' },
    },
    layoutMeta: {
      themeColor: '#2563EB',
      geoRegion: 'IN-RJ',
      geoPlacename: 'Jaipur',
      geoPosition: '26.8517696;75.8062041',
      icbm: '26.8517696, 75.8062041',
      googlebot: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
      bingbot: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
      faviconIco: '/favicon.ico',
      appleTouchIcon: '/apple-touch-icon.png',
    },
    stats: [
      { label: 'Happy Customers', value: '5000+', icon: 'Users', order: 0 },
      { label: 'Orders Delivered', value: '50K+', icon: 'Package', order: 1 },
      { label: 'Satisfaction Rate', value: '99%', icon: 'Award', order: 2 },
      { label: 'Support Available', value: '24/7', icon: 'Clock', order: 3 },
    ],
    trustBadges: ['Unmatched Customization', 'Affordable Bulk Orders', 'Fast Turnaround'],
    personSchema: {
      name: 'Mahendra Choudhary',
      jobTitle: 'Director',
      worksFor: 'The Cross Wild',
    },
  };

  const existing = await SiteSettings.findOne({ key: 'default' });
  if (existing) {
    console.log('  ↻ SiteSettings already exists — leaving as-is.');
    return;
  }
  await SiteSettings.create(data);
  console.log('  ✓ SiteSettings created');
}

async function seedMenus() {
  const menus = [
    {
      key: 'header-primary',
      items: [
        { label: 'All Products', href: '/products', order: 0 },
      ],
    },
    {
      key: 'header-mobile',
      items: [
        { label: 'Home', href: '/', order: 0 },
        { label: 'All Products', href: '/products', order: 1 },
        { label: 'Services', href: '/services', order: 2 },
        { label: 'How It Works', href: '/our_process', order: 3 },
        { label: 'About Us', href: '/about-us', order: 4 },
        { label: 'Contact Us', href: '/contact-us', order: 5 },
        { label: 'Blog', href: '/blog', order: 6 },
        { label: 'Gallery', href: '/image-gallery', order: 7 },
      ],
    },
    {
      key: 'footer-services',
      items: [
        { label: 'T-Shirt Manufacturing', href: '/product/customize-promotional-t-shirt-manufacturer-in-Jaipur', order: 0 },
        { label: 'Sweatshirt Manufacturing', href: '/product/sweatshirt-hoodie-manufacturer-in-Jaipur', order: 1 },
        { label: 'Bag Manufacturer', href: '/product/school-laptop-bag-manufacturer-in-Jaipur', order: 2 },
        { label: 'Cap Manufacturer', href: '/product/cap-printing-manufacturer-in-jaipur', order: 3 },
        { label: 'Mug Printing', href: '/product/mug-printing-in-Jaipur', order: 4 },
        { label: 'Digital Printing', href: '/product/printing', order: 5 },
        { label: 'Face Masks & PPE Kits', href: '/product/face-mask-and-ppe-kit-manufacturer-jaipur', order: 6 },
        { label: 'Sanitizer & Infrared Thermometer', href: '/product/sanitizer-and-infrared-thermometer-wholesaler-jaipur', order: 7 },
        { label: 'School Uniform', href: '/product/school-uniform', order: 8 },
        { label: 'Staff Uniform', href: '/product/staff-uniform-manufacturer', order: 9 },
      ],
    },
    {
      key: 'footer-quick-links',
      items: [
        { label: 'Home', href: '/', order: 0 },
        { label: 'About Us', href: '/about-us', order: 1 },
        { label: 'Our Process', href: '/our_process', order: 2 },
        { label: 'Blog', href: '/blog', order: 3 },
        { label: 'Our Gallery', href: '/image-gallery', order: 4 },
        { label: 'Contact Us', href: '/contact-us', order: 5 },
        { label: 'Why Choose Us', href: '/why-choose-us', order: 6 },
        { label: 'Privacy Policy', href: '/privacy-policy', order: 7 },
        { label: 'Disclaimer', href: '/disclaimer', order: 8 },
      ],
    },
    {
      key: 'footer-bottom',
      items: [
        { label: 'Privacy Policy', href: '/privacy-policy', order: 0 },
        { label: 'Terms of Service', href: '#', order: 1 },
        { label: 'Cookie Policy', href: '#', order: 2 },
      ],
    },
  ];

  for (const m of menus) {
    const existing = await Menu.findOne({ key: m.key });
    if (existing) {
      console.log(`  ↻ Menu ${m.key} exists — skipping`);
      continue;
    }
    await Menu.create(m);
    console.log(`  ✓ Menu ${m.key} created`);
  }
}

async function seedPolicyPages() {
  const pages = [
    {
      slug: 'disclaimer',
      title: 'Disclaimer',
      metaTitle: 'Disclaimer - The Cross Wild',
      metaDescription: 'Important information about the use of this website.',
      intro: '',
      sections: [
        {
          heading: '',
          body:
            '<p>The information contained in this website is for general information purposes only. The information is provided by The Cross Wild and while we endeavour to keep the information up to date and correct, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability or availability with respect to the website or the information, products, services, or related graphics contained on the website for any purpose. Any reliance you place on such information is therefore strictly at your own risk.</p>',
          order: 0,
        },
        {
          heading: '',
          body:
            '<p>In no event will we be liable for any loss or damage including without limitation, indirect or consequential loss or damage, or any loss or damage whatsoever arising from loss of data or profits arising out of, or in connection with, the use of this website.</p>',
          order: 1,
        },
        {
          heading: '',
          body:
            '<p>Through this website you are able to link to other websites which are not under the control of The Cross Wild. We have no control over the nature, content and availability of those sites. The inclusion of any links does not necessarily imply a recommendation or endorse the views expressed within them.</p>',
          order: 2,
        },
        {
          heading: '',
          body:
            '<p>Every effort is made to keep the website up and running smoothly. However, The Cross Wild takes no responsibility for, and will not be liable for, the website being temporarily unavailable due to technical issues beyond our control.</p>',
          order: 3,
        },
      ],
    },
    {
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      metaTitle: 'Privacy Policy | The Cross Wild',
      metaDescription:
        'This privacy policy has been compiled to better serve those concerned with how their Personally identifiable information (PII) is being used online at The Cross Wild.',
      intro:
        '<p>This privacy policy has been compiled to better serve those concerned with how their "Personally identifiable information" (PII) is being used online. PII encompasses information identifying individuals or enabling contact.</p>',
      sections: [
        {
          heading: 'When do we collect information?',
          body:
            '<p>We collect information from you when you register on our site, fill out a form or enter information on our site.</p><p><strong>What personal information do we collect:</strong></p><ul><li>Name, email address, phone number, Company Details or other details</li></ul>',
          order: 0,
        },
        {
          heading: 'How do we use your information?',
          body:
            '<p>We may use the information we collect from you when you register, make a purchase, sign up for our newsletter, respond to a survey or marketing communication, surf the website, or use certain other site features.</p>',
          order: 1,
        },
        {
          heading: 'How do we protect visitor information?',
          body:
            '<p>Our website is scanned on a regular basis for security holes and known vulnerabilities in order to make your visit to our site as safe as possible.</p><ul><li>We use regular Malware Scanning.</li><li>We do not use an SSL certificate.</li></ul>',
          order: 2,
        },
        {
          heading: "Do we use 'cookies'?",
          body:
            '<p>Yes. Cookies are small files that a site or its service provider transfers to your computer\'s hard drive through your Web browser (if you allow) that enables the site\'s or service provider\'s systems to recognize your browser and capture and remember certain information.</p>',
          order: 3,
        },
        {
          heading: 'We use cookies to:',
          body:
            '<p>Compile aggregate data about site traffic and site interactions in order to offer better site experiences and tools in the future. We may also use trusted third party services that track this information on our behalf.</p>',
          order: 4,
        },
        {
          heading: 'Third Party Disclosure',
          body:
            '<p>We do not sell, trade, or otherwise transfer to outside parties your personally identifiable information.</p>',
          order: 5,
        },
        {
          heading: 'Third party links',
          body: '<p>We do not include or offer third party products or services on our website.</p>',
          order: 6,
        },
        {
          heading: 'Google',
          body:
            '<p>Google\'s advertising requirements can be summed up by Google\'s Advertising Principles. We use Google Ad Sense Advertising on our website. Google, as a third party vendor, uses cookies to serve ads on our site. Users may opt out of the use of the DART cookie by visiting the Google ad and content network privacy policy.</p>',
          order: 7,
        },
        {
          heading: 'Fair Information Practices',
          body:
            '<p>The Fair Information Practices Principles form the backbone of privacy law in the United States. In order to be in line with Fair Information Practices, should a data breach occur, we will notify the users via email within 7 business days.</p>',
          order: 8,
        },
        {
          heading: 'CAN SPAM Act',
          body:
            '<p>The CAN-SPAM Act is a law that sets the rules for commercial email. If at any time you would like to unsubscribe from receiving future emails, you can email us and we will promptly remove you from ALL correspondence.</p>',
          order: 9,
        },
        {
          heading: 'Contacting Us',
          body:
            '<p>If there are any questions regarding this privacy policy you may contact us using the information below.</p><address>thecrosswild.com<br/>D-8, Near World Trade Park, Malviya Nagar, Jaipur<br/><a href="mailto:orders@thecrosswild.com">orders@thecrosswild.com</a></address>',
          order: 10,
        },
      ],
    },
  ];

  for (const p of pages) {
    const existing = await PolicyPage.findOne({ slug: p.slug });
    if (existing) {
      console.log(`  ↻ PolicyPage ${p.slug} exists — skipping`);
      continue;
    }
    await PolicyPage.create(p);
    console.log(`  ✓ PolicyPage ${p.slug} created`);
  }
}

async function seedDeals() {
  const deals = [
    { title: 'Bulk Order Special', discountLabel: '20% OFF', description: 'Orders above 100 pieces', link: '/product/customize-promotional-t-shirt-manufacturer-in-Jaipur', order: 0 },
    { title: 'Flash Sale', discountLabel: '15% OFF', description: 'Limited time offer', badge: 'Ending Soon', link: '/product/mug-printing-in-Jaipur', order: 1 },
    { title: 'First Order', discountLabel: '10% OFF', description: 'New customers only', link: '/products', order: 2 },
  ];
  for (const d of deals) {
    const existing = await Deal.findOne({ title: d.title });
    if (existing) {
      console.log(`  ↻ Deal "${d.title}" exists — skipping`);
      continue;
    }
    await Deal.create(d);
    console.log(`  ✓ Deal "${d.title}" created`);
  }
}

async function seedHomeCapabilities() {
  const items = [
    { title: 'T-Shirts', items: ['Custom Corporate Tees', 'Budget-Friendly Printing', 'Event-Specific Designs'], link: '/product/customize-promotional-t-shirt-manufacturer-in-Jaipur', order: 0 },
    { title: 'Bags', items: ['Custom Gym Bags', 'Wholesale Tote Suppliers', 'Laptop Bags (India)'], link: '/product/school-laptop-bag-manufacturer-in-Jaipur', order: 1 },
    { title: 'Caps', items: ['Branded & Embroidered Caps', 'Baseball & Trucker Styles', 'Eco-Friendly Options'], link: '/product/cap-printing-manufacturer-in-jaipur', order: 2 },
  ];
  for (const c of items) {
    const existing = await HomeCapability.findOne({ title: c.title });
    if (existing) {
      console.log(`  ↻ HomeCapability "${c.title}" exists — skipping`);
      continue;
    }
    await HomeCapability.create(c);
    console.log(`  ✓ HomeCapability "${c.title}" created`);
  }
}

async function seedHomeWhyChoose() {
  const items = [
    { number: '01', title: 'Unmatched Customization', description: 'We offer custom artwork with every order, ensuring your products are unique and perfectly matched with your exact needs. Our designers are widely experienced in logos, images and patterns that can meet your branding needs.', order: 0 },
    { number: '02', title: 'Affordable Bulk Manufacturing', description: 'Ordering large quantities can be expensive. We make it affordable to get there with every bulk custom t-shirt order, personalized bags in bulk or promotional campaign caps without sacrificing quality.', order: 1 },
    { number: '03', title: 'Fast Turnaround Times', description: 'We put our customers first by making sure that your orders are packed and sent as soon as possible. On most orders you will even receive free delivery for added convenience.', order: 2 },
  ];
  for (const item of items) {
    const existing = await HomeWhyChoose.findOne({ number: item.number, title: item.title });
    if (existing) {
      console.log(`  ↻ HomeWhyChoose "${item.title}" exists — skipping`);
      continue;
    }
    await HomeWhyChoose.create(item);
    console.log(`  ✓ HomeWhyChoose "${item.title}" created`);
  }
}

async function seedHomeProductHighlights() {
  const items = [
    { title: 'Mug Printing', image: '/images/products/Mugs/Promotional-Mug.jpg', link: '/product/mug-printing-in-Jaipur', order: 0 },
    { title: 'Cap Printing', image: '/images/products/Caps/Sports-Cap.jpg', link: '/product/cap-printing-manufacturer-in-jaipur', order: 1 },
    { title: 'Digital Printing', image: '/images/products/Digital-Printing/Digital-Printing.jpg', link: '/product/printing', order: 2 },
  ];
  for (const item of items) {
    const existing = await HomeProductHighlight.findOne({ title: item.title });
    if (existing) {
      console.log(`  ↻ HomeProductHighlight "${item.title}" exists — skipping`);
      continue;
    }
    await HomeProductHighlight.create(item);
    console.log(`  ✓ HomeProductHighlight "${item.title}" created`);
  }
}

async function seedCategoryHomeCards() {
  const items = [
    { title: 'T-Shirts', description: 'Custom printed & embroidered tees', icon: '👕', link: '/product/customize-promotional-t-shirt-manufacturer-in-Jaipur', popular: true, order: 0 },
    { title: 'Bags', description: 'School, office, gym & more', icon: '🎒', link: '/product/school-laptop-bag-manufacturer-in-Jaipur', popular: true, order: 1 },
    { title: 'Caps', description: 'Cotton, polyester & custom caps', icon: '🧢', link: '/product/cap-printing-manufacturer-in-jaipur', popular: false, order: 2 },
    { title: 'Sweatshirts & Hoodies', description: 'Warm up in custom style', icon: '🧥', link: '/product/sweatshirt-hoodie-manufacturer-in-Jaipur', popular: false, order: 3 },
    { title: 'Lower & Shorts', description: 'Comfortable active wear', icon: '🩳', link: '/category/lowers', popular: false, order: 4 },
    { title: 'School & Office Uniform', description: 'Professional workwear solutions', icon: '👔', link: '/product/school-uniform', popular: false, order: 5 },
    { title: 'Printing & Embroidery', description: 'Screen, digital & sublimation', icon: '🖨️', link: '/product/printing', popular: false, order: 6 },
    { title: 'Apron & Chef Coat', description: 'Kitchen & hospitality wear', icon: '🧑‍🍳', link: '/category/apron', popular: false, order: 7 },
  ];
  for (const item of items) {
    const existing = await CategoryHomeCard.findOne({ title: item.title });
    if (existing) {
      console.log(`  ↻ CategoryHomeCard "${item.title}" exists — skipping`);
      continue;
    }
    await CategoryHomeCard.create(item);
    console.log(`  ✓ CategoryHomeCard "${item.title}" created`);
  }
}

async function seedProcessSteps() {
  const items = [
    { number: '1', title: 'Client Meeting', description: 'Understanding your vision and requirements to craft tailored solutions.', icon: 'Handshake', page: 'both', order: 0 },
    { number: '2', title: 'Sampling', description: 'Collaborate with us to select or create unique and innovative designs.', icon: 'ClipboardList', page: 'both', order: 1 },
    { number: '3', title: 'Fabric Cutting', description: 'Precision cutting using advanced tools to ensure quality and accuracy.', icon: 'Scissors', page: 'both', order: 2 },
    { number: '4', title: 'Stitching', description: 'Skilled artisans perform stitching for durability and comfort.', icon: 'ShieldCheck', page: 'both', order: 3 },
    { number: '5', title: 'Printing', description: 'High-quality printing techniques for vibrant and long-lasting designs.', icon: 'Printer', page: 'both', order: 4 },
    { number: '6', title: 'Quality Check', description: 'Thorough quality inspections to ensure flawless products.', icon: 'ShieldCheck', page: 'both', order: 5 },
    { number: '7', title: 'Packing & Shipping', description: 'Secure packaging and fast delivery through trusted partners worldwide.', icon: 'Package', page: 'both', order: 6 },
  ];
  for (const item of items) {
    const existing = await ProcessStep.findOne({ title: item.title });
    if (existing) {
      console.log(`  ↻ ProcessStep "${item.title}" exists — skipping`);
      continue;
    }
    await ProcessStep.create(item);
    console.log(`  ✓ ProcessStep "${item.title}" created`);
  }
}

async function seedServiceCards() {
  const items = [
    {
      title: 'T-Shirts',
      slug: 'tshirts',
      intro: 'Custom T-shirt manufacturing from ₹70/piece. We offer Polo, Round Neck, V-Neck, and Dry-Fit Sports styles with high-quality fabric and professional printing for corporates, events, and bulk orders.',
      features: ['Elegant & Classic Colors', 'Skin-Friendly Fabric', 'Exclusive Designs', 'Perfect Fit to Body'],
      link: '/category/tshirts',
      images: [
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366749/crosswild/products/migrated/0c06d108827197660b14472a650fc036.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366753/crosswild/products/migrated/29789ee9122312588a1facf5f9bdc7dd.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366757/crosswild/products/migrated/68b8fbc7dfab9d830a9e38d62f2502ac.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366774/crosswild/products/migrated/f5528e5386c99cd334f4dab763edbd92.jpg' },
      ],
      order: 0,
    },
    {
      title: 'Bags',
      slug: 'bags',
      intro: 'Large-scale bag manufacturing for school, college, laptop, travel, office, corporate, food delivery, grocery, gym, and backpack categories. Custom design and printing, waterproof options available.',
      features: ['Durable & Stylish', 'Fine Quality Raw Materials', 'Custom Printing Options', 'Waterproof Variants'],
      link: '/category/bags',
      images: [
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366765/crosswild/products/migrated/a9605470f8ab81052d979aaf10cbfcd1.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366760/crosswild/products/migrated/7ce7854d3bdabdb70d535cc6635b8a1e.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366765/crosswild/products/migrated/909a8a47ec773aab30a62f4842e7ece6.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366757/crosswild/products/migrated/64967665b8a0a42eeff038a1a4da662b.jpg' },
      ],
      order: 1,
    },
    {
      title: 'Caps',
      slug: 'caps',
      intro: 'Pioneer in customized cap printing in Jaipur. We design caps for every occasion — corporate, sports, tourist, and plain caps with embroidery and the latest printing technology at minimum prices.',
      features: ['Premium Customization', 'Adjustable Strap', 'Long Lasting & Cost Effective', 'Embroidery Technology'],
      link: '/category/caps',
      images: [
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366753/crosswild/products/migrated/3a24a9801ed1dbdd1b4bf5d5d911eda2.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366768/crosswild/products/migrated/ac448874f5641fe053e423a219cd4ce0.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366768/crosswild/products/migrated/cd1ffc6104e185ecb2dfefd56ee0eb66.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366771/crosswild/products/migrated/eacd5a023684aca00f9c8450c970c904.jpg' },
      ],
      order: 2,
    },
    {
      title: 'School & Office Uniform',
      slug: 'uniforms',
      intro: 'Quality uniforms for students, teachers, and staff. We manufacture school uniforms (girls, boys, pre-primary, house, sports) and professional educator attire with polyester cotton fabric across 6+ cities.',
      features: ['Polyester Cotton Blend', 'Custom Designs', 'Sports & House Uniforms', 'Pan-India Delivery'],
      link: '/category/uniforms',
      images: [
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366760/crosswild/products/migrated/6f037be3dce207d89d5cdafd83cd28ce.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366772/crosswild/products/migrated/ebe8c56622667e5d29c12316b2f7e8b1.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366760/crosswild/products/migrated/7a6ba77b5a3ca04de4ef9479825461d1.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366762/crosswild/products/migrated/8ea195c9b0a741b7d76d1979a679dbc8.jpg' },
      ],
      order: 3,
    },
    {
      title: 'Sweatshirts & Hoodies',
      slug: 'sweatshirts',
      intro: 'Prime sweatshirt printer in Jaipur. Customized woolens with soft fabric and durable stitching for corporates, companies, and shops. Breathable, wind-resistant designs available in multiple styles.',
      features: ['Quick Delivery', 'High-Quality Fabric', 'Fine Print Quality', 'Breathable & Wind-Resistant'],
      link: '/category/sweatshirts',
      images: [
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366755/crosswild/products/migrated/564e4a74f39c30ede3ea2f262debe4a4.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366765/crosswild/products/migrated/98475159d591ffdc68f5ed05821be0e9.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366771/crosswild/products/migrated/ec96c104e6f55f8814b9071a92156210.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366757/crosswild/products/migrated/5e582bc24b0af8858daeaa4c41d4febf.jpg' },
      ],
      order: 4,
    },
    {
      title: 'Lower & Shorts',
      slug: 'lowers',
      intro: 'Comfortable and durable lower & shorts for sports teams, schools, gyms, and corporate events. Custom printing and branding available for bulk orders at competitive prices.',
      features: ['Comfortable Fit', 'Durable Fabric', 'Custom Branding', 'Bulk Orders Welcome'],
      link: '/category/lowers',
      images: [
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366774/crosswild/products/migrated/f5528e5386c99cd334f4dab763edbd92.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366757/crosswild/products/migrated/5e582bc24b0af8858daeaa4c41d4febf.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366760/crosswild/products/migrated/7a6ba77b5a3ca04de4ef9479825461d1.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366772/crosswild/products/migrated/ebe8c56622667e5d29c12316b2f7e8b1.jpg' },
      ],
      order: 5,
    },
    {
      title: 'Printing & Embroidery',
      slug: 'printing',
      intro: 'Largest commercial printing company in Jaipur. We specialise in digital, screen, sublimation, and rubber printing on T-shirts, bags, caps, mugs, and sweatshirts. Bright, durable prints for bulk orders.',
      features: ['Digital Printing', 'Screen Printing', 'Sublimation Printing', 'Rubber Printing & Embroidery'],
      link: '/category/printing',
      images: [
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366771/crosswild/products/migrated/eb85bc3c535700dfb594d1d6751244ac.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366765/crosswild/products/migrated/a34823c6ca08d69011b704e0e9551548.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366755/crosswild/products/migrated/4c2c70e121e7476fa095c187b6ab2a2e.jpg' },
        { url: 'https://res.cloudinary.com/djvsjbzez/image/upload/v1779366760/crosswild/products/migrated/68ee7632b4a386af593eafa8458d17b8.jpg' },
      ],
      order: 6,
    },
  ];
  for (const item of items) {
    const existing = await ServiceCard.findOne({ slug: item.slug });
    if (existing) {
      console.log(`  ↻ ServiceCard "${item.slug}" exists — skipping`);
      continue;
    }
    await ServiceCard.create(item);
    console.log(`  ✓ ServiceCard "${item.slug}" created`);
  }
}

async function seedWhyChooseReasons() {
  const reasons = [
    'Timely Work',
    'Best Price',
    'Quality',
    'Service',
    'Experience',
    'Trust our work',
    'Quick response',
    'After delivery responsible',
    'Big team',
    'Check review',
    'The wide range of product',
  ];
  for (let i = 0; i < reasons.length; i++) {
    const text = reasons[i];
    const existing = await WhyChooseReason.findOne({ text });
    if (existing) {
      console.log(`  ↻ WhyChooseReason "${text}" exists — skipping`);
      continue;
    }
    await WhyChooseReason.create({ text, order: i });
    console.log(`  ✓ WhyChooseReason "${text}" created`);
  }
}

async function seedSizeCharts() {
  const chart = {
    name: 'default',
    description: 'Standard T-shirt size chart (inches)',
    sizes: [
      { label: 'S', chest: '36', length: '27', shoulder: '17' },
      { label: 'M', chest: '38', length: '28', shoulder: '18' },
      { label: 'L', chest: '40', length: '29', shoulder: '19' },
      { label: 'XL', chest: '42', length: '30', shoulder: '20' },
      { label: 'XXL', chest: '44', length: '31', shoulder: '21' },
      { label: '3XL', chest: '46', length: '32', shoulder: '22' },
    ],
  };
  const existing = await SizeChart.findOne({ name: chart.name });
  if (existing) {
    console.log('  ↻ SizeChart "default" exists — skipping');
    return;
  }
  await SizeChart.create(chart);
  console.log('  ✓ SizeChart "default" created');
}

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  console.log('Seeding SiteSettings…');         await seedSiteSettings();
  console.log('\nSeeding Menus…');               await seedMenus();
  console.log('\nSeeding PolicyPages…');         await seedPolicyPages();
  console.log('\nSeeding Deals…');               await seedDeals();
  console.log('\nSeeding HomeCapabilities…');    await seedHomeCapabilities();
  console.log('\nSeeding HomeWhyChoose…');       await seedHomeWhyChoose();
  console.log('\nSeeding HomeProductHighlights…'); await seedHomeProductHighlights();
  console.log('\nSeeding CategoryHomeCards…');   await seedCategoryHomeCards();
  console.log('\nSeeding ProcessSteps…');        await seedProcessSteps();
  console.log('\nSeeding ServiceCards…');        await seedServiceCards();
  console.log('\nSeeding WhyChooseReasons…');    await seedWhyChooseReasons();
  console.log('\nSeeding SizeCharts…');          await seedSizeCharts();

  console.log('\n✅ CMS seed complete.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
