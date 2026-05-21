const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  label: { type: String, default: '' },
  href: { type: String, default: '' },
  order: { type: Number, default: 0 },
  children: [{
    label: { type: String, default: '' },
    href: { type: String, default: '' },
    order: { type: Number, default: 0 },
  }],
}, { _id: false });

const branchOfficeSchema = new mongoose.Schema({
  city: { type: String, default: '' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  hours: { type: String, default: '' },
  email: { type: String, default: '' },
  mapLink: { type: String, default: '' },
  order: { type: Number, default: 0 },
}, { _id: false });

const statItemSchema = new mongoose.Schema({
  label: { type: String, default: '' },
  value: { type: String, default: '' },
  icon: { type: String, default: '' },
  order: { type: Number, default: 0 },
}, { _id: false });

const siteSettingsSchema = new mongoose.Schema({
  // Singleton key — always 'default'
  key: { type: String, default: 'default', unique: true },

  header: {
    logo: { type: String, default: '' },
    logoTrackingCode: { type: String, default: '' },
    logoPublicId: { type: String, default: '' },
    logoAlt: { type: String, default: 'The CrossWild' },
    topBarPhone: { type: String, default: '' },
    topBarEmail: { type: String, default: '' },
    topBarLinks: [linkSchema],
    navLinks: [linkSchema],
    promoTicker: [{ type: String }],
    customizeCTA: {
      label: { type: String, default: 'Customize' },
      whatsappUrl: { type: String, default: '' },
      emailMailto: { type: String, default: '' },
    },
  },

  footer: {
    logo: { type: String, default: '' },
    logoTrackingCode: { type: String, default: '' },
    logoPublicId: { type: String, default: '' },
    companyDescription: { type: String, default: '' },
    copyrightText: { type: String, default: '' },
    bottomLinks: [linkSchema],
    servicesLinks: [linkSchema],
    quickLinks: [linkSchema],
    newsletter: {
      enabled: { type: Boolean, default: true },
      heading: { type: String, default: '' },
      subheading: { type: String, default: '' },
      placeholder: { type: String, default: 'Enter your email' },
      buttonLabel: { type: String, default: 'Subscribe' },
    },
    branchOffices: [branchOfficeSchema],
  },

  contact: {
    primaryPhone: { type: String, default: '' },
    secondaryPhones: [{ type: String }],
    primaryEmail: { type: String, default: '' },
    secondaryEmails: [{ type: String }],
    whatsappNumber: { type: String, default: '' },
    whatsappPrefilledMessage: { type: String, default: '' },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: '' },
      geo: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 },
      },
    },
  },

  social: {
    facebook: { type: String, default: '' },
    twitter: { type: String, default: '' },
    instagram: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    youtube: { type: String, default: '' },
    pinterest: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
  },

  floatingButtons: {
    call: {
      enabled: { type: Boolean, default: true },
      phone: { type: String, default: '' },
      ariaLabel: { type: String, default: 'Call us' },
    },
    whatsapp: {
      enabled: { type: Boolean, default: true },
      url: { type: String, default: '' },
      ariaLabel: { type: String, default: 'Chat with us on WhatsApp' },
    },
  },

  layoutMeta: {
    themeColor: { type: String, default: '#2563EB' },
    geoRegion: { type: String, default: '' },
    geoPlacename: { type: String, default: '' },
    geoPosition: { type: String, default: '' },
    icbm: { type: String, default: '' },
    googlebot: { type: String, default: '' },
    bingbot: { type: String, default: '' },
    faviconIco: { type: String, default: '' },
    faviconIcoTrackingCode: { type: String, default: '' },
    faviconIcoPublicId: { type: String, default: '' },
    appleTouchIcon: { type: String, default: '' },
    appleTouchIconTrackingCode: { type: String, default: '' },
    appleTouchIconPublicId: { type: String, default: '' },
  },

  stats: [statItemSchema],
  trustBadges: [{ type: String }],

  personSchema: {
    name: { type: String, default: '' },
    jobTitle: { type: String, default: '' },
    worksFor: { type: String, default: '' },
  },
}, { timestamps: true });

// Singleton helper
siteSettingsSchema.statics.getSettings = async function () {
  let doc = await this.findOne({ key: 'default' });
  if (!doc) {
    doc = await this.create({ key: 'default' });
  }
  return doc;
};

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
