require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');

const CATEGORIES = [
  {
    id: 'tshirts',
    name: 'T-Shirts',
    icon: '👕',
    subcategories: [
      { id: 'dry-fit-tshirts', name: 'Dry Fit T-Shirts', seoUrl: 'dry-fit-tshirts' },
      { id: 'cotton-tshirts', name: 'Cotton T-Shirts', seoUrl: 'cotton-tshirts' },
      { id: 'polyester-tshirts', name: 'Polyester T-Shirts', seoUrl: 'polyester-tshirts' },
      { id: 'cotton-polyester-tshirts', name: 'Cotton + Polyester T-Shirts', seoUrl: 'cotton-polyester-tshirts' },
      { id: 'sports-jersey', name: 'Sports Jersey', seoUrl: 'sports-jersey' },
      { id: 'promotional-tshirts', name: 'Promotional T-Shirts', seoUrl: 'promotional-tshirts' },
      { id: 'custom-tshirts', name: 'Custom T-Shirts', seoUrl: 'custom-tshirts' },
      { id: 'oversized-tshirts', name: 'Oversized T-Shirts', seoUrl: 'oversized-tshirts' },
      { id: 'lycra-tshirts', name: 'Lycra T-Shirts', seoUrl: 'lycra-tshirts' },
    ],
  },
  {
    id: 'bags',
    name: 'Bags',
    icon: '👜',
    subcategories: [
      { id: 'school-bags', name: 'School Bags', seoUrl: 'school-bags' },
      { id: 'laptop-bags', name: 'Laptop Bags', seoUrl: 'laptop-bags' },
      { id: 'office-bags', name: 'Office Bags', seoUrl: 'office-bags' },
      { id: 'gym-bags', name: 'Gym Bags', seoUrl: 'gym-bags' },
      { id: 'corporate-bags', name: 'Corporate Bags', seoUrl: 'corporate-bags' },
      { id: 'food-delivery-bags', name: 'Food Delivery Bags', seoUrl: 'food-delivery-bags' },
      { id: 'cotton-bags', name: 'Cotton Bags', seoUrl: 'cotton-bags' },
      { id: 'file-folder-bags', name: 'File & Folder Bags', seoUrl: 'file-folder-bags' },
    ],
  },
  {
    id: 'caps',
    name: 'Caps',
    icon: '🧢',
    subcategories: [
      { id: 'cotton-caps', name: 'Cotton Caps', seoUrl: 'cotton-caps' },
      { id: 'cotton-polyester-caps', name: 'Cotton & Polyester Caps', seoUrl: 'cotton-polyester-caps' },
      { id: 'polyester-caps', name: 'Polyester Caps', seoUrl: 'polyester-caps' },
      { id: 'promotional-custom-caps', name: 'Promotional & Custom Caps', seoUrl: 'promotional-custom-caps' },
      { id: 'hats', name: 'Hats', seoUrl: 'hats' },
      { id: 'tennis-caps', name: 'Tennis Caps', seoUrl: 'tennis-caps' },
      { id: 'sports-caps', name: 'Sports Caps', seoUrl: 'sports-caps' },
      { id: 'corduroy-caps', name: 'Corduroy Fabric Caps', seoUrl: 'corduroy-fabric-caps' },
      { id: 'denim-caps', name: 'Denim Caps', seoUrl: 'denim-caps' },
      { id: 'kids-caps', name: 'Kids Caps', seoUrl: 'kids-caps' },
      { id: 'imported-caps', name: 'Imported Fabric Caps', seoUrl: 'imported-fabric-caps' },
    ],
  },
  {
    id: 'sweatshirts',
    name: 'Sweatshirts & Hoodies',
    icon: '🧥',
    subcategories: [
      { id: 'jackets', name: 'Jackets', seoUrl: 'jackets' },
      { id: 'cotton-jackets', name: 'Cotton Jackets', seoUrl: 'cotton-jackets' },
      { id: 'sweatshirts-hoodies', name: 'Sweatshirts & Hoodies', seoUrl: 'sweatshirts-hoodies' },
      { id: 'spun-spun-sweatshirts', name: 'Spun-Spun Sweatshirts & Hoodies', seoUrl: 'spun-spun-sweatshirts-hoodies' },
      { id: 'polyester-sweatshirts', name: 'Polyester Sweatshirts & Hoodies', seoUrl: 'polyester-sweatshirts-hoodies' },
      { id: 'cotton-polyester-sweatshirts', name: 'Cotton & Polyester Sweatshirts & Hoodies', seoUrl: 'cotton-polyester-sweatshirts-hoodies' },
    ],
  },
  {
    id: 'lowers',
    name: 'Lower & Shorts',
    icon: '👖',
    subcategories: [
      { id: 'dot-knit-shorts', name: 'Dot Knit Fabric Shorts & Lower', seoUrl: 'dot-knit-fabric-shorts-lower' },
      { id: 'nirmal-shorts', name: 'Nirmal Material Fabric Lower & Shorts', seoUrl: 'nirmal-material-fabric-lower-shorts' },
      { id: 'raisenet-shorts', name: 'Raisenet Lower & Shorts', seoUrl: 'raisenet-lower-shorts' },
      { id: 'dry-fit-shorts', name: 'Dry Fit Lower & Shorts', seoUrl: 'dry-fit-lower-shorts' },
      { id: 'cotton-shorts', name: 'Cotton Lower & Shorts', seoUrl: 'cotton-lower-shorts' },
      { id: 'ns-shorts', name: 'NS Lower & Shorts', seoUrl: 'ns-lower-shorts' },
    ],
  },
  {
    id: 'uniforms',
    name: 'School & Office Uniform',
    icon: '👔',
    subcategories: [
      { id: 'school-uniform', name: 'School Uniform & Dress', seoUrl: 'school-uniform-dress' },
      { id: 'office-uniform', name: 'Office Employee Uniform & Dress', seoUrl: 'office-employee-uniform-dress' },
      { id: 'custom-uniforms', name: 'Custom Uniforms', seoUrl: 'custom-uniforms' },
    ],
  },
  {
    id: 'printing',
    name: 'Printing & Embroidery',
    icon: '🖨️',
    subcategories: [
      { id: 'screen-printing', name: 'Screen Printing', seoUrl: 'screen-printing' },
      { id: 'tf-printing', name: 'TF Printing', seoUrl: 'tf-printing' },
      { id: 'digital-printing', name: 'Digital Printing', seoUrl: 'digital-printing' },
      { id: 'sublimation-printing', name: 'Sublimation Printing', seoUrl: 'sublimation-printing' },
      { id: 'embroidery', name: 'Embroidery', seoUrl: 'embroidery' },
    ],
  },
  {
    id: 'apron',
    name: 'Apron',
    icon: '🍳',
    subcategories: [],
  },
  {
    id: 'chef-coat',
    name: 'Chef Coat',
    icon: '👨‍🍳',
    subcategories: [],
  },
  {
    id: 'raincoats',
    name: 'Raincoats',
    icon: '🌧️',
    subcategories: [],
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing categories
    const deleted = await Category.deleteMany({});
    console.log(`Cleared ${deleted.deletedCount} existing categories`);

    let parentCount = 0;
    let subCount = 0;

    for (const cat of CATEGORIES) {
      // Create parent category
      const parent = await Category.create({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        parentCategory: null,
        seoUrl: cat.id,
        isActive: true,
      });
      parentCount++;
      console.log(`✅ Created category: ${cat.name}`);

      // Create subcategories
      for (const sub of cat.subcategories) {
        await Category.create({
          id: sub.id,
          name: sub.name,
          parentCategory: parent._id,
          seoUrl: sub.seoUrl,
          isActive: true,
        });
        subCount++;
      }
      if (cat.subcategories.length > 0) {
        console.log(`   └── ${cat.subcategories.length} subcategories added`);
      }
    }

    console.log(`\n🎉 Seeding complete!`);
    console.log(`   📁 ${parentCount} parent categories`);
    console.log(`   📄 ${subCount} subcategories`);
    console.log(`   📊 ${parentCount + subCount} total entries`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
