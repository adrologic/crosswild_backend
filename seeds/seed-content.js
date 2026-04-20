require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const PageContent = require('../models/PageContent');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('ERROR: MONGODB_URI not set.'); process.exit(1); }

const sections = [
  // ─── HOME ────────────────────────────────────────────────────────────────
  {
    pageSlug: 'home',
    sectionKey: 'hero',
    data: {
      tagline: 'Founded in 2016 — Trusted Across India',
      h1: 'Custom T-Shirts, Bags, and Caps',
      h1Highlight: 'Manufacturer',
      h1Suffix: 'in Jaipur, India',
      description: 'Founded in 2016, The Cross Wild has grown into one of the most trusted names in custom product printing and manufacturing in India. Based in Jaipur, we are proud to be a leading t-shirt manufacturer, bag manufacturer, and custom cap manufacturer with a rapidly expanding presence across India and internationally. Our goal is to be the ultimate one-stop shop for all customized product manufacturing and printing needs, offering unmatched quality and service.',
      cta1Text: 'Add to Enquiry',
      cta1Url: '/contact-us',
      cta2Text: 'Our Process',
      cta2Url: '/our_process',
      slides: [
        { src: '/images/hero/hero-1.webp', alt: 'Custom T-shirt Manufacturer Jaipur' },
        { src: '/images/hero/hero-2.webp', alt: 'Custom Bags Manufacturer Jaipur' },
        { src: '/images/hero/hero-3.webp', alt: 'Custom Caps Manufacturer Jaipur' },
        { src: '/images/hero/hero-4.webp', alt: 'Promotional Products India' },
        { src: '/images/hero/hero-5.jpg', alt: 'Custom Printing Services Jaipur' },
      ],
    },
  },
  {
    pageSlug: 'home',
    sectionKey: 'trust',
    data: {
      heading: 'Why Choose The CrossWild?',
      subheading: "We're committed to delivering excellence in every order",
      features: [
        { title: 'Fast Delivery', description: 'Quick turnaround time with pan-India shipping', icon: 'Truck' },
        { title: '100% Quality Guarantee', description: 'Premium materials and strict quality checks', icon: 'Shield' },
        { title: '24/7 Support', description: 'Always here to help with your orders', icon: 'Headphones' },
        { title: 'Best Prices', description: 'Competitive pricing with bulk discounts', icon: 'Award' },
        { title: 'Quick Turnaround', description: 'Get your products in 3-5 business days', icon: 'Clock' },
        { title: 'Easy Ordering', description: 'Simple design tools and hassle-free process', icon: 'ThumbsUp' },
      ],
    },
  },
  {
    pageSlug: 'home',
    sectionKey: 'why-choose',
    data: {
      heading: 'Customize & Promote with The Cross Wild',
      description: 'At The Cross Wild, we cover a wide spectrum of industries and events with products that fulfill functionality yet are stylish. Whether you are a business needing branded corporate T-shirts, a company looking for wholesale tote bags outlet or an event organizer to source custom bags and personalized hats The Cross Wild is sure to cater for all your needs. Over the years, our dedication to customer satisfaction has driven us to expand our portfolio. In addition to t-shirt printing and bag manufacturing, we now specialize in custom caps, mug printing, sweater manufacturing, and more. Leveraging state-of-the-art technologies, we deliver high-quality personalized and promotional products at competitive prices.',
      points: [
        {
          title: '1. Unmatched Customization',
          description: 'We offer custom artwork with every order, ensuring your products are unique and perfectly matched with your exact needs. Our designers are widely experienced in logos, images and patterns that can meet your branding needs.',
        },
        {
          title: '2. Affordable Bulk Manufacturing',
          description: 'Ordering large quantities can be expensive. We make it affordable to get there with every bulk custom t-shirt order, personalized bags in bulk or promotional campaign caps without sacrificing quality.',
        },
        {
          title: '3. Fast Turnaround Times',
          description: 'We put our customers first by making sure that your orders are packed and sent as soon as possible. On most orders you will even receive free delivery for added convenience.',
        },
      ],
    },
  },

  // ─── ABOUT US ────────────────────────────────────────────────────────────
  {
    pageSlug: 'about-us',
    sectionKey: 'intro',
    data: {
      heading: 'About Us',
      paragraph: 'Since 2016, The Cross Wild has been a trusted name in Indian custom printing and manufacturing. Located in peaceful Jaipur, we thrive and flourish as a custom cap manufacturer, bag manufacturer, and t-shirt manufacturer in Jaipur. The Cross Wild is now represented in India and has a growing presence overseas. The mission of The Cross Wild is to provide quality and service superior in every respect. We will become the ultimate one-stop shop for all kinds of custom product manufacturing as well as printing.',
      paragraph2: 'Over time, our determined pursuit of customer satisfaction has led us to broaden what we do. Our current specializations include not only t shirt fashion but also services like handbag manufacturing for such clients as The Cross Wild Hotel as well as Custom Cap Manufacturing. With this latest advance in printing technology to embroider your company logo you can make an ever lasting impression on your clients. When using our top-quality materials and the latest printing technology, we create personalized and promotional products that are professional efficient in delivery–besides both high-quality and low price.',
      servicesList: [
        'T-Shirt Manufacturing',
        'Sweatshirt & Hoodie Manufacturing',
        'Bag Manufacturing',
        'Cap Manufacturing',
        'Mug Printing',
        'Digital Printing',
        'School & Staff Uniforms',
        'Face Masks & PPE Kits',
      ],
    },
  },
  {
    pageSlug: 'about-us',
    sectionKey: 'what-we-offer',
    data: {
      heading: 'What We Offer',
      subheading: 'At The Cross Wild, we focus on infrastructure so that we can provide a vast range of custom and promotional products tailored to your exact needs:',
      items: [
        {
          title: 'Custom and Promotional T-Shirts',
          description: 'The highest quality of service in all categories, including corporate t-shirts. Event-specific t-shirts have been a leading source of business for The Cross Wild; we are also engaged in personalization and promotion among our line-up.',
        },
        {
          title: 'Bags',
          description: 'There is a definitive need to be met in the area of school, computer or gym bags. Likewise, people who work remotely need a corporate bag and travelers appreciate the addition of sturdy travel bags with their other luggage.',
        },
        {
          title: 'Custom Printed Caps',
          description: 'Class products that are sure to satisfy one\'s taste buds with this laminated co-polymer technique.',
        },
        {
          title: 'Mugs',
          description: 'But now wherever you go, you will find a mug.',
        },
        {
          title: 'Hoodies & Sweatshirts',
          description: 'Warm. Durable. Customizable to satisfy your own personal tastes.',
        },
      ],
    },
  },
  {
    pageSlug: 'about-us',
    sectionKey: 'values',
    data: {
      heading: 'Value to Customers',
      paragraph: 'Our primary goal is to offer more to the customer. This is our way of helping people make the smooth transition into work, every step that needs to take pride in being put together',
      items: [
        { title: 'This includes everything from sophisticated corporate bags all the way down to t-shirts personalized for your home town and more.' },
        { title: 'Through association with each employee and acquaintance, have management become a better form of business.' },
        { title: 'Spacious, clean and safe production facilities guarantee a productive work environment for all staff.' },
        { title: 'Fast delivery everywhere in India, rest assured that all orders arrive on time!' },
        { title: 'Durable high-quality products that can stand the test of time.' },
        { title: 'Pricing is reasonable, with bulk and volume orders carried out at privileged prices.' },
      ],
    },
  },
  {
    pageSlug: 'about-us',
    sectionKey: 'why-choose-us',
    data: {
      heading: 'Why Choose Us?',
      subheading: "Here's why we are trusted by businesses and individuals alike for their custom product manufacturing needs:",
      features: [
        { title: '100% India-Based Operations', description: 'All our products are proudly manufactured in India.' },
        { title: 'Top Quality Prints with Precision', description: 'We use advanced printing technology for accurate designs.' },
        { title: 'Transparent Pricing', description: 'No hidden costs – what you see is what you get.' },
        { title: 'Innovative Design Studio', description: 'Get access to our extensive library of design options or create your own custom artwork.' },
        { title: 'Comprehensive Customization', description: "Whether it's personalized t-shirts, bags, or caps, we've got you covered." },
        { title: 'Drop Shipping Services', description: "Hassle-free delivery to your customers' doorstep." },
      ],
    },
  },
  {
    pageSlug: 'about-us',
    sectionKey: 'founder',
    data: {
      heading: 'Founder',
      name: 'Mr. Mahendra Choudhary',
      description: 'The Cross Wild is the vision of Mr. Mahendra Choudhary, a passionate and innovative entrepreneur with a keen understanding of the industry. His focus on providing premium-quality wholesale products has helped The Cross Wild create a unique niche in the market. His leadership and customer centric approach have been pivotal in establishing us as a trusted partner for businesses, organizations, and individuals alike.',
    },
  },

  // ─── OUR PROCESS ─────────────────────────────────────────────────────────
  {
    pageSlug: 'our-process',
    sectionKey: 'intro',
    data: {
      h1: 'Our Process',
      h2: 'Welcoming You All From Our Facility At Jaipur',
      description: 'We want to provide products tailored specifically for you. Do You Know What We Look Up For As A Custom Hoodie Manufacturer In Jaipur? We Want Customer Experience To Be Great Every Time. This is part of our unique manufacturing process, which we are carrying out to ensure that you only receive the items that fit your style and needs the best. Here\'s how we do it:',
    },
  },
  {
    pageSlug: 'our-process',
    sectionKey: 'steps',
    data: {
      steps: [
        {
          num: 1,
          title: 'Client Meeting',
          icon: 'Handshake',
          img: '/images/about/clinte-meet.jpg',
          alt: 'Client meeting at our Jaipur facility',
          text: 'We are committed to finding the right products for you. To tailor to your particular needs, we hold various meetings with our team to discuss in-depth your specific use case and ensure we don\'t miss a thing with your vision. From Wholesale Hoodies Manufacturer in Jaipur to Custom Caps for Teams in Jaipur, we listen to you in detail before progressing for Sampling phase.',
        },
        {
          num: 2,
          title: 'Sampling',
          icon: 'ClipboardList',
          img: '/images/about/fabric-smapling.jpg',
          alt: 'Sampling and design selection',
          text: 'We have a huge range of personalized tools for both people and businesses that can meet all budgets and all purposes (even tailored for you!) We provide you the option to choose from our exclusive designs or create your template when you become a Personalized Hoodie Manufacturer in Jaipur. After finalizing the design, we now head to the next step: Fabric Cutting.',
        },
        {
          num: 3,
          title: 'Fabric Cutting',
          icon: 'Scissors',
          img: '/images/about/fabricCutting1.jpg',
          alt: 'Precision fabric cutting',
          text: 'Once the sample is confirmed we cut the fabric to the desired shape. We are one of the best Custom hoodie suppliers also in Jaipur — you can choose any kind of grey/red hoodie sizes and styles and we will ship in small or large, customized as per your instruction. From one piece to one thousand we create each and every piece to your specifications.',
        },
        {
          num: 4,
          title: 'Stitching',
          icon: 'Spool',
          img: '/images/about/sttching.jpg',
          alt: 'High quality stitching',
          text: 'Our Hoodie Manufacturing Company in Jaipur is proud to offer precision. To make sure your custom hoodie or custom cap is prepared with greatest care and a focus on detail, skilled artisans perform high quality stitching. This is where your product starts to take shape, helping to deliver the quality craftsmanship that our clients expect.',
        },
        {
          num: 5,
          title: 'Printing',
          icon: 'Printer',
          img: '/images/about/digitalPrint.webp',
          alt: 'Advanced printing methods',
          text: 'Our Expertise in advanced printing methods such as digital printing, screen printing, sublimation printing, rubber printing, etc. We are a Printed Hoodie Manufacturer in Jaipur, and with the best and latest technology and tools on the market, we take the utmost care to ensure you get complete satisfaction on your personalized products like hoodie, cap, bags, etc. Printed with clear and smudge-free designs that will last for long.',
        },
        {
          num: 6,
          title: 'Checking and Testing',
          icon: 'ShieldCheck',
          img: '/images/about/testing.jpeg',
          alt: 'Quality control and testing',
          text: 'We are known as Branded Hoodie Manufacturer in Jaipur where we believe in delivering error-free goods to our end users. Each product is individually checked and tested to ensure the highest quality by our quality control team. We make the necessary changes so that your ordering is perfect, if any modification is required.',
        },
        {
          num: 7,
          title: 'Packing and Shipping',
          icon: 'Package',
          img: '/images/about/pakingg.png',
          alt: 'Packing and shipping',
          text: 'After your product passes the quality tests, we pack it securely and prepare it for delivery. We work with trusted shipping partners as a Hoodie Manufacturer for E-commerce in Jaipur, to ensure your order reaches you safely and on time. We can help you save on shipping costs and add to your profit margin whether your order is a bulk order or a small custom order.',
        },
      ],
    },
  },

  // ─── CONTACT US ──────────────────────────────────────────────────────────
  {
    pageSlug: 'contact-us',
    sectionKey: 'info',
    data: {
      heading: 'Contact Us',
      subheading: "We'll follow up with you as soon as possible. You can also email us at orders@thecrosswild.com to fasten up the support process.",
      email: 'orders@thecrosswild.com',
      formHeading: 'Send Us a Message',
      offices: [
        {
          title: 'Corporate Office',
          city: 'Jaipur',
          address: 'D-8, Near World Trade Park, D-Block, Malviya Nagar, Jaipur, Rajasthan 302017',
          phone: ['+91-9571815050', '+91-9529626262'],
          hours: 'Mon–Sat: 9:00 AM – 6:00 PM',
        },
        {
          title: 'Jodhpur Branch Location',
          city: 'Jodhpur',
          address: 'B-13, Shastri Nagar, Near Shastri Circle, Jodhpur, Rajasthan 342003',
          phone: ['+91-9571286262'],
          hours: 'Mon–Sat: 9:00 AM – 6:00 PM',
        },
        {
          title: 'Indore Branch Location',
          city: 'Indore',
          address: '401, 4th Floor, Near Sky Corporate Tower, Scheme No 78, AB Road, Vijay Nagar, Indore, Madhya Pradesh 452010',
          phone: ['+91-9649715050'],
          hours: 'Mon–Sat: 9:00 AM – 6:00 PM',
        },
        {
          title: 'Udaipur Branch Location',
          city: 'Udaipur',
          address: '45, Moti Magri Scheme, Zinc Park, Udaipur, Rajasthan 313001',
          phone: ['+91-9549066262'],
          hours: 'Mon–Sat: 9:00 AM – 6:00 PM',
        },
      ],
    },
  },

  // ─── WHY CHOOSE US PAGE ──────────────────────────────────────────────────
  {
    pageSlug: 'why-choose-us',
    sectionKey: 'main',
    data: {
      h1: 'Why Choose The Crosswild as a Trusted Partner',
      heading: 'for Custom Printing & Quality Craftsmanship',
      description: 'The Crosswild combines quality, affordability, and passion in custom printing. Experience superior service, competitive pricing, and designs tailored to your needs.',
      features: [
        { title: '100% India-Based Operations', description: 'All our products are proudly manufactured in India, supporting local craftsmanship.' },
        { title: 'Top Quality Prints with Precision', description: 'We use advanced printing technology — digital, screen, sublimation — for accurate, vibrant designs.' },
        { title: 'Transparent Pricing', description: 'No hidden costs – what you see is what you get. Competitive bulk pricing always.' },
        { title: 'Innovative Design Studio', description: 'Get access to our extensive design library or create your own custom artwork with our designers.' },
        { title: 'Comprehensive Customization', description: "Whether it's personalized t-shirts, bags, or caps — any logo, any color, any quantity." },
        { title: 'Drop Shipping Services', description: "We deliver directly to your customers' doorstep, making fulfilment hassle-free." },
        { title: 'Fast Turnaround', description: 'Most orders dispatched within 3–5 business days. Rush delivery available.' },
        { title: 'Dedicated Account Support', description: 'A dedicated team member for every bulk account, available Mon–Sat.' },
      ],
    },
  },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  let upserted = 0;
  let errors = 0;

  for (const item of sections) {
    try {
      await PageContent.findOneAndUpdate(
        { pageSlug: item.pageSlug, sectionKey: item.sectionKey },
        { $set: { data: item.data, isActive: true } },
        { upsert: true, new: true }
      );
      console.log(`  ✓ ${item.pageSlug}/${item.sectionKey}`);
      upserted++;
    } catch (err) {
      console.error(`  ✗ ${item.pageSlug}/${item.sectionKey}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n📊 Done — ${upserted}/${sections.length} sections seeded, ${errors} errors`);
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
