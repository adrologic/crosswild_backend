require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');

const categories = [
  { id: 'tshirts', name: 'T-Shirts', icon: '👕', description: 'Custom printed t-shirts' },
  { id: 'sweatshirts', name: 'Sweatshirts', icon: '🧥', description: 'Comfortable sweatshirts' },
  { id: 'caps', name: 'Caps', icon: '🧢', description: 'Stylish caps and hats' },
  { id: 'bags', name: 'Bags', icon: '🎒', description: 'Custom bags and totes' },
  { id: 'mugs', name: 'Mugs', icon: '☕', description: 'Personalized mugs' },
  { id: 'cards', name: 'Business Cards', icon: '💳', description: 'Professional business cards' },
  { id: 'printing', name: 'Printing', icon: '🖨️', description: 'Various printing services' },
  { id: 'uniforms', name: 'Uniforms', icon: '👔', description: 'Corporate and school uniforms' },
  { id: 'gifts', name: 'Gifts', icon: '🎁', description: 'Custom gift items' },
];

const seedCategories = async () => {
  if (process.env.SEED_ALLOW_WIPE !== 'true') {
    console.error('⛔ Refusing to run destructive seed; set SEED_ALLOW_WIPE=true to allow.');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('🗑️  Cleared existing categories');

    // Insert new categories (insertMany bypasses the pre-save hook,
    // so generate seoUrl here the same way the model hook does)
    const docs = categories.map(cat => ({
      ...cat,
      seoUrl: cat.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    }));
    await Category.insertMany(docs);
    console.log(`✅ Seeded ${categories.length} categories`);

    console.log('\n📋 Categories:');
    categories.forEach(cat => {
      console.log(`   ${cat.icon} ${cat.name} (${cat.id})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

seedCategories();
