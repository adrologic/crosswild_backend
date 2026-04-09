/**
 * Location Pages Seed Script
 *
 * Deletes all existing SEO-type location pages and inserts 13 fresh ones
 * matching exactly the production content at thecrosswild.com.
 *
 * Usage:
 *   node seed-locations.js "mongodb+srv://USER:PASS@cluster.mongodb.net/DBNAME"
 *
 * Or set MONGODB_URI in environment and run:
 *   MONGODB_URI="..." node seed-locations.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.argv[2] || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: Provide MongoDB URI as first argument or set MONGODB_URI env var.');
  process.exit(1);
}

// ── SLUGS TO DELETE / REPLACE ──────────────────────────────────────────────
const SLUGS_TO_DELETE = [
  'tshirt-manufacturer-in-jodhpur',
  'bags-manufacturer-in-Jodhpur',
  'bags-manufacturer-in-jodhpur',
  'cap-printing-manufacturer-jodhpur',
  'uniform-manufacturer-jodhpur',
  'tshirt-manufacturer-in-indore',
  'bag-manufacturer-in-indore',
  'uniform-manufacturer-in-indore',
  'bags-manufacturing-company-in-udaipur',
  'tshirt-manufacturer-wholesaler-in-udaipur',
  'tshirt-manufacturer-wholesaler-in-Kota',
  'tshirt-manufacturer-wholesaler-in-kota',
  'bags-manufacturing-company-in-Kota',
  'bags-manufacturing-company-in-kota',
  'tshirt-manufacturer-wholesaler-in-sikar',
  'bags-manufacturing-company-in-sikar',
];

// ── PAGE DATA ───────────────────────────────────────────────────────────────
const LOCATION_PAGES = [
  {
    slug: 'tshirt-manufacturer-in-jodhpur',
    isActive: true,
    h1: 'Custom T-shirt Manufacturing Company in Jodhpur',
    metaTitle: 'T-Shirt Manufacturers and Printing in Jodhpur - The Cross Wild',
    metaDescription: 'Prices start at just Rs. 70. Crosswild is a leading T-shirt manufacturing and supplier company in Jodhpur. We customise and print T-shirts for schools, colleges, events, and promotions at affordable prices.',
    city: 'Jodhpur',
    category: 'tshirt',
    categoryLabel: 'T-Shirt',
    branchAddress: 'B-13, Shastri Nagar, Near Shastri Circle, Jodhpur, Rajasthan 342003',
    branchPhone: '+91-9571286262',
    branchHours: 'Monday–Saturday, 10:00 AM – 6:30 PM',
    mapLink: 'https://maps.google.com/?q=B-13+Shastri+Nagar+Jodhpur',
    showPrintingMethods: true,
    showFabrics: true,
    showSizeChart: true,
    introContent: `<p>Crosswild is considered to be the best company for custom t-shirt manufacturing in Jodhpur, where you can get a huge variety of both casual and formal t-shirts. All the t-shirts are made using high-quality fabric, which ensures that it is shrink-resistant and colour-stable. Now, could you promote your brand with customised options with us?</p>
<p>We are the top t-shirt manufacturing company in Jodhpur, where all the employees are highly trained and use quality printing technology to print on t-shirts. You can find t-shirts with us at wholesale prices in different styles, colours, and sizes according to your requirements.</p>
<h2>Polo, Sports, Round Neck T-shirt Printing in Jodhpur for School or College</h2>
<p>If you are looking for T-shirt maker for school or college in Jodhpur then you can come to us as we print T-shirts keeping in mind the different demands of the customers. At Crosswild, you can find unique T-shirts like Polo, Sports, and Round Neck that ensure a perfect fit on the body. And at a better price than the market. Every T-shirt we have has an elegant and attractive look that helps to enhance the look of the wearer.</p>
<p>We also offer custom jersey or T-shirt printing services in Jodhpur for corporate, personal events and sports events like marathon, cricket, yoga etc. with screen printing as well as sublimation printing. We also design different types of T-shirts in your brand name or design according to your customized size fit requirement. So now you can order your favourite style T-shirt in bulk quantity, that too at a reasonable price.</p>`,
  },

  {
    slug: 'bags-manufacturer-in-Jodhpur',
    isActive: true,
    h1: 'Bags Manufacturing in Jodhpur',
    metaTitle: 'Bags Manufacturers & Supplier in Jodhpur, India - The Crosswild',
    metaDescription: 'Prices start @ Rs 140 only. The Crosswild is leading manufacturer and supplier of School bags, College bags, Laptop bags, Delivery Bags, Office bags and Ladies bags at wholesale price in Jodhpur, India.',
    city: 'Jodhpur',
    category: 'bags',
    categoryLabel: 'Bags',
    branchAddress: 'B-13, Shastri Nagar, Near Shastri Circle, Jodhpur, Rajasthan 342003',
    branchPhone: '+91-9571286262',
    branchHours: 'Monday–Saturday, 10:00 AM – 6:30 PM',
    mapLink: 'https://maps.google.com/?q=B-13+Shastri+Nagar+Jodhpur',
    showPrintingMethods: false,
    showFabrics: false,
    showSizeChart: false,
    introContent: `<p>Nowadays, it is often seen that the standard of an individual is judged through the sense of his or her clothing. As fashion is increasing day by day, bags are also now considered as part of clothing. If you are in Jodhpur and looking for the best bags manufacturer in Jodhpur then you have arrived absolutely at the right place.</p>
<p>The CrossWild is the superlative bags manufacturing company in Jodhpur where both designing and printing of bags are done. At our organization, bags are the most manufactured products due to which are known as topmost bags manufacturing company in Jodhpur.</p>
<p>The CrossWild has a reputation to complete bulk orders of bags within the time at an affordable price. We manufacture and sell commercial food delivery bags for Zomato, Uber Eats, Swiggy and Corporate (office) bags.</p>
<h2>Our Complete Range Includes:</h2>
<p>Our complete range of bags is designed in such a manner that it is sure to reflect your class. The positive reviews from our customers have made us the chief supplier in Jodhpur.</p>
<p>With us, you can find different varieties of bags that too at an affordable price. Be it laptop bag, school bag, back bag or gym bag you can find all bags at wholesale price.</p>
<p>The entire bags manufacturer for school &amp; college in Jodhpur is getting tough competition from us. With our wide collection of bags, we make sure that all our customers get complete satisfaction.</p>
<p>We are one of the known manufacturers of bag packs. You can find this bag at our store in a modern &amp; stylish design that is sure to suit your personality.</p>
<p>We are leading bags supplier for school bags that are made under the supervision of experts using quality material, ensuring its enhanced durability. School bags can easily carry all your books &amp; copies easily.</p>
<p>We are a well-known manufacturer of laptop bags in Rajasthan. You can avail of this bag in different sizes, styles, and shapes as per your choice.</p>
<p>This bag is ideal for people who go to the gym because it can carry all the gym items easily.</p>`,
  },

  {
    slug: 'cap-printing-manufacturer-jodhpur',
    isActive: true,
    h1: 'Promotional Cap Manufacturing Company in Jodhpur',
    metaTitle: 'Custom Caps Manufacturer for Business Promotion in Jodhpur',
    metaDescription: 'We are a reputed cap manufacturer in Jodhpur, such as promotional caps, convocation caps and caps for sports events. Call 9571286262 for the best deal.',
    city: 'Jodhpur',
    category: 'caps',
    categoryLabel: 'Caps',
    branchAddress: 'B-13, Shastri Nagar, Near Shastri Circle, Jodhpur, Rajasthan 342003',
    branchPhone: '+91-9571286262',
    branchHours: 'Monday–Saturday, 10:00 AM – 6:30 PM',
    mapLink: 'https://maps.google.com/?q=B-13+Shastri+Nagar+Jodhpur',
    showPrintingMethods: false,
    showFabrics: false,
    showSizeChart: false,
    introContent: `<p>There are many marketing gimmicks on the market — some of them are even good. But we often focus too much on the flashy stuff and forget the little things that actually work. Here's an example: using a simple but effective promotional hat. Yes, it can do wonders for your business, but only if it's done right. And luckily, you've landed on Cross Wild, the perfect site for your premium promotional product needs.</p>
<p>At Cross Wild, we bring you promotional cap solutions that not only protect your style but will also act as a powerful branding tool for your business. Just imagine someone wearing these and then think about how every glance will become an opportunity to showcase your company's identity. And we are the best partner that you could have asked for your requirement.</p>
<p>We have an extensive manufacturing facility based in Jodhpur — a facility that is finely tuned to deliver quality every time. We also offer a vast range of options for you to choose from — from snapbacks &amp; trucker hats to beanies and more. And don't forget the customization features we offer. You can personalize your promotional caps with your company logo, color schemes, and any other design elements that represent your brand.</p>
<h2>Why Choose Cross Wild for Bulk Orders of Custom Design Caps in Jodhpur?</h2>
<p>When it comes to bulk orders of custom designed caps, Cross Wild is the perfect choice. We are one of the best makers in the market with a team of experts. We are also well aware that in the competitive world of business promotion, every little detail matters. So you can expect us to ensure that even the smallest details are perfect.</p>
<p>Also, our promotional caps are not just about head wear to your audience; they are much more than that. Our aim is to create a memorable experience with the gear — something that will stay with your audience. And that is the core of what we do when creating these masterpieces. Every cap we produce is an opportunity to further your brand's reach &amp; recognition. And don't worry about our prices as well — we are highly competitive with them, and with our special commitment to quality, you simply cannot find a better partner than us.</p>
<p>So are you ready to increase your brand's visibility? If yes, then partner with Cross Wild today for a bulk order of custom design caps in Jodhpur. And then watch your brand soar to new heights with great ease!</p>`,
  },

  {
    slug: 'uniform-manufacturer-jodhpur',
    isActive: true,
    h1: 'Office Staff Uniform, Hospital, Hotel & Resort Dress in Jodhpur',
    metaTitle: 'Uniform Manufacturer with Branding for School, Medical and Hotel in Jodhpur',
    metaDescription: 'We are the leading uniform manufacturer and supplier in Jodhpur with custom design branding for school, medical and industrial needs.',
    city: 'Jodhpur',
    category: 'uniform',
    categoryLabel: 'Uniform',
    branchAddress: 'B-13, Shastri Nagar, Near Shastri Circle, Jodhpur, Rajasthan 342003',
    branchPhone: '+91-9571286262',
    branchHours: 'Monday–Saturday, 10:00 AM – 6:30 PM',
    mapLink: 'https://maps.google.com/?q=B-13+Shastri+Nagar+Jodhpur',
    showPrintingMethods: false,
    showFabrics: false,
    showSizeChart: false,
    introContent: `<p>Do you know what makes a place (especially one that is involved in the service industry) look professional? It is actually the uniform that is worn by the people working there. It might be a small thing, but it undoubtedly plays a crucial role. And when it comes to professional uniforms — be it for your office staff, hospital personnel, hotel front desk teams, or resort staff — Cross Wild has got you covered.</p>
<p>Cross Wild is a leader when it comes to uniform making solutions in Jodhpur. We specialize in not just designing &amp; manufacturing high-quality uniforms, but we actually tailor these to suit your needs.</p>
<p>It is our customization options that actually sets us apart from our competitors. You can choose your brand logo, tagline, or a specific colour scheme integrated into your design — whatever you need — and it is all done with an unmatched finesse. So are you ready to let your team look sharp, stay comfortable and represent your brand with pride?</p>
<h2>School Uniform Makers for Students and Teachers in Jodhpur</h2>
<p>At Cross Wild, our focus is on bringing comfort and durability together - and when we create school uniforms, we add school spirit to them. Because we believe that school uniforms should be more than just standard attire.</p>
<p>As a leading school uniform manufacturer in Jodhpur, we cater to the needs of both students and teaching staff, creating uniforms as per school guidelines without compromising on functionality and comfort. We also provide solutions for a wide range of needs. Whether you need pre-primary uniforms, senior secondary, skirts, shirts, trousers, or winter wear — we do it all. And yes, we also craft distinct staff uniforms that maintain a formal look and at the same time offer all-day comfort in classrooms.</p>
<h2>Why Choose Us for Uniform Supplier in Jodhpur?</h2>
<p>Cross Wild will be a reliable manufacturer for your uniforms in Jodhpur as our in-house team will take care of everything — from design to delivery. The result? A smooth &amp; seamless experience from start to finish.</p>
<p>What makes us different? It is our custom-fit solution, and we guarantee that we will not make any compromises with the quality. This is especially useful with office &amp; industrial uniforms.</p>
<p>Cross Wild understands that comfort, functionality &amp; durability are all non-negotiable. So with our creations, you are assured that they are designed to be breathable, can be easily maintained and even resist daily wear &amp; tear pretty well. In simplest terms, choosing Cross Wild is the best decision that you can make today!</p>`,
  },

  {
    slug: 'tshirt-manufacturer-in-indore',
    isActive: true,
    h1: 'Custom T-shirt Manufacturing Company Indore at Affordable Prices',
    metaTitle: 'Promotional Corporate T-shirt Manufacturers in Indore',
    metaDescription: 'The Cross Wild is a leading manufacturer of customized T-shirts for corporate in Indore for advertising events, sports etc. at affordable prices. Call Now',
    city: 'Indore',
    category: 'tshirt',
    categoryLabel: 'T-Shirt',
    branchPhone: '+91-9649715050',
    showPrintingMethods: true,
    showFabrics: true,
    showSizeChart: true,
    introContent: `<p>What if you are looking for high quality custom t-shirt manufacturer in Indore City? The Cross Wild, one of the leading T-shirts manufacturing company in Indore, will realize your ideas with precision while ensuring style and affordability. From a startup company to a corporate brand or an event organizer, our custom-made T-shirts are a distinctive way to get noticed. For businesses, we cater to bulk manufacturing of T-shirts with almost everything from logo placements to bright, everlasting prints.</p>
<p>We know that every brand is distinct, so at The Cross Wild, we offer an eclectic option of customizing from diverse fabrics to colors and sizes to designs, all manufactured from high-grade quality materials and well-advanced printing technology. Our house team ensures fast production and appropriate delivery without compromising quality.</p>
<p>What makes us different? We are a company that offers comfort. Be it casual wear for employees or striking T-shirts for an occasion, we have all that. The best part is that you will be availing these services at an affordable price tailored for business houses in Indore and beyond. Partner us and see your brand identity born with every T-shirt created.</p>
<h2>Why Choose Customized Printed T-shirts for Corporate Advertising Events?</h2>
<p>Custom printed T-shirts serve as a smart and low-cost means to promote your brand at events, trade shows, or corporate meetups. They differ from traditional forms of advertising in that they have moving, wearable visibility – your logo is on the move with everyone wearing it! These T-shirts build your team, improve brand recall, and enhance the corporate look with professionalism.</p>
<p>Custom t-shirts also help in company giveaways, product launches, and employee uniforms to enhance a unified brand image. They are cost-effective, which means a way of impressing potential clients and partners with an exceptional design and finish of the brand message at each event-turned-marketing opportunity.</p>
<p>With The Cross Wild in Indore, you can have it custom-made and well-finished, and it is a great advertising solution that gives style to the word and works! Your brand can talk a great deal with every print!</p>`,
  },

  {
    slug: 'bag-manufacturer-in-indore',
    isActive: true,
    h1: 'Custom Bag Manufacturing Company in Indore At Best Price',
    metaTitle: 'Bag Manufacturers in Indore for Business, Corporate, School with Branding',
    metaDescription: 'We are leading manufacturer and supplier of custom laptop backpacks, food delivery bags, travel bags for corporate in Indore. Contact 9649715050',
    city: 'Indore',
    category: 'bags',
    categoryLabel: 'Bags',
    branchPhone: '+91-9649715050',
    showPrintingMethods: false,
    showFabrics: false,
    showSizeChart: false,
    introContent: `<p>Are you in search of the perfect bags for your personal or business needs in Indore? For everyone, from small startups to large companies, The Cross Wild is a trusted custom bag manufacturing company in Indore offering tailor-made solutions for the brand or business. Our bag designs meet your requirements while keeping your brand identity in mind.</p>
<p>At The Cross Wild, we manufacture all sorts of bags made with durable materials and expert craftsmanship: from fabric selection to your company name or logo, everything can be customized to reflect your style. Be it school bags, promotional offers, corporate office bags, food delivery bag or customer giveaways — we possess a wide variety.</p>
<p>Our speciality is merging style, durability, and affordability. We maintain very affordable prices without compromising quality. Our Indore production facility accepts bulk and small orders, always with a fast turnaround time. For all your custom bag needs in Indore, The Cross Wild should be your partner of choice.</p>
<h2>Grocery, Gym, Office, School Bags with Company Name and Logo in Indore</h2>
<p>At The Cross Wild, we manufacture all sorts of custom bags for every need you may have. Do you need eco-friendly grocery bags for your shop, with your logo on them? What about stylish gym bags for your brand? Need something sleek for your team, like office laptop bags? Or maybe you are a school searching for durable and personalized school bags?</p>
<p>We focus on printing the names of your company, its logos, and custom designs, thereby giving visibility and professionalism on top of the product. With The Cross Wild, you get practical and branded bags that also market your business every single day.</p>
<p>Our highly competent team will craft each bag with superb precision, quality, and keen attention to detail. Their services will avail you to the seamless experience from design to delivery. Choosing your color, size and material lets your brand's mark and impression really match it.</p>`,
  },

  {
    slug: 'uniform-manufacturer-in-indore',
    isActive: true,
    h1: 'Sports, School Uniform Manufacturers & Suppliers in Indore',
    metaTitle: 'Best Uniform Makers in Indore for Hospitals, Schools and Corporate',
    metaDescription: 'Are you looking for uniform manufacturer then contact The Cross Wild, a renowned company for manufacturing custom uniforms for hospitals, business, school in Indore at best prices. Inquire Now',
    city: 'Indore',
    category: 'uniform',
    categoryLabel: 'Uniform',
    branchPhone: '+91-9649715050',
    showPrintingMethods: false,
    showFabrics: false,
    showSizeChart: false,
    introContent: `<p>If you are desperately looking for premium quality sports, school and staff uniforms in Indore to improve your business identity as well as team unity but also ensure that people look professional, then you need not look further than us. The Cross Wild is a trusted name in the industry among the leading uniform manufacturers and suppliers in Indore. We stand tall for providing durable, comfortable, and finely stitched uniforms for students and athletes. Our main objective is to provide custom uniform solutions that suit the different needs of schools and various sports institutions. Whether it is a school shirt or trousers and jerseys, count on us as your first resort for all your uniform needs.</p>
<p>We have a team of highly expert people who specialize in creating modern designs. We don't only use high-quality fabrics but also pay attention to details when creating uniforms to meet the branding needs of the organizations. Whether it's bulk orders or smaller batches, The Cross Wild will serve all your purposes without letting you compromise on style, comfort, and quality.</p>
<h2>Custom Uniforms for Hospital and Medical Staff in Indore at the Best Price</h2>
<p>At The Cross Wild, we specialize in creating custom uniforms for hospitals and medical staff. As a leading uniform hospital and medical staff uniforms manufacturer in Indore, we understand the importance of quality, comfort, hygiene, and functionality. We provide uniforms made of breathable fabric which is not only skin-friendly but also serves comfort for long hours. We keep our eyes on details while customizing the uniform for medical professionals.</p>
<p>With us, you don't have to worry about the stitch and consistency in quality. From embroidery options to cost-effective pricing, we take care of everything. No matter what your uniform needs may be, we go the extra mile to accomplish them. Moreover, our prices are affordable. With the sole purpose of providing the best uniform to our customers, we are openly accepting your thoughts for customization. So, what are you waiting for? Reach out today and discuss your needs with us to get your customized uniforms at the best possible prices in the industry.</p>`,
  },

  {
    slug: 'bags-manufacturing-company-in-udaipur',
    isActive: true,
    h1: 'Bags Manufacturer in Udaipur',
    metaTitle: 'Bags Manufacturer & Suppliers in Udaipur, India - The Crosswild',
    metaDescription: 'Prices start @ Rs 140 only. The Crosswild is leading manufacturer and wholesale supplier company of bags for School, College, Laptop, Food Delivery, Corporate and Ladies bags at wholesale price in Udaipur, India.',
    city: 'Udaipur',
    category: 'bags',
    categoryLabel: 'Bags',
    showPrintingMethods: false,
    showFabrics: false,
    showSizeChart: false,
    introContent: `<p>If you are still looking for the best Bags Manufacturer in Udaipur then your search ends here. The CrossWild is considered as the topmost company involved in offering a wide gamut of bags at a very reasonable price.</p>
<p>All the bags are manufactured using quality material which not only ensures their high strength but also enhanced durability. Be it, bag pack, school bag, laptop bag, gym bag, office bag, travel bag or corporate bag, we are offering everything.</p>
<p>Our company has a large production unit through which we can manufacture thousands of bags in 24 hours. We are also considered as the leading Bags Wholesaler in Udaipur because we offer quality bags at wholesale price.</p>
<p>When it comes to quality, we never compromise on that because the quality is the first priority for us. Our complete range of bags is a perfect combination of comfort and style.</p>
<p>All the bags that are designed are coated with special chemicals which help in adding strength and ensure its waterproof nature. We make amazing foldable and unbreakable food delivery bags for different online food delivery website like Swiggy, Zomato, UberEats as well as EatFit at a very cost-effective price.</p>
<p>All our bags are highly spacious and perfectly designed that are sure to meet your exact requirement. We also provide customized bags in order to meet the exact requirement of our clients.</p>
<h2>Bag Pack:</h2>
<p>We are one of the topmost manufacturers in Udaipur offering a wide assortment of eye-catchy bag pack that is highly spacious and have good strength. You can purchase this bag pack in different colours, styles and patterns as per your requirement. This bag is light in weight but can handle heavyweight easily.</p>
<h2>School Bag:</h2>
<p>Our complete range of school bag is designed using a trendy machine as well as a premium quality fabric at a cost-effective price. In this bag, you will find separate space for carrying books as well as copies. It is an attractive school bag and is available in different sizes and patterns.</p>
<h2>Laptop Bag:</h2>
<p>Our company is a leading manufacturer in Udaipur involved in providing laptop bags in different sizes, patterns and colours at a reasonable price. We have a team of professionals who manufacture these laptop bags using quality fabric ensuring its excellent strength.</p>
<h2>Gym Bag:</h2>
<p>This gym bag is perfect for carrying all the gym essentials with ease like gym clothes, energy drink as well as a water bottle. This bag is perfectly designed using quality fabric which is easy to maintain and wash. It is available in different patterns &amp; sizes at a pocket-friendly price.</p>`,
  },

  {
    slug: 'tshirt-manufacturer-wholesaler-in-udaipur',
    isActive: true,
    h1: 'T-shirt Manufacturer in Udaipur',
    metaTitle: 'T-Shirt Manufacturer and Wholesaler in Udaipur - The Crosswild',
    metaDescription: 'Prices start @ Rs 70 only. The Crosswild is a leading t-shirt manufacturer and supplier company in Udaipur, Rajasthan. We manufacture customize t-shirts for schools, colleges, events, and promotions at wholesale price.',
    city: 'Udaipur',
    category: 'tshirt',
    categoryLabel: 'T-Shirt',
    showPrintingMethods: true,
    showFabrics: true,
    showSizeChart: true,
    introContent: `<p>Nowadays everyone prefers a t-shirt for both formal and casual wear. You can now offer t-shirt in bulk from The CrossWild which is known as a reputable T-shirt Manufacturer in Udaipur offering quality t-shirt at a reasonable price.</p>
<p>All our t-shirts are designed using quality fabric which ensures perfect fitting and high comfort. Before the final dispatch, all the t-shirts are strictly checked on different standards in order to ensure its perfect finish and premium quality.</p>
<p>With us, you can find a wide assortment of an eye-catchy t-shirt in different sizes, styles and patterns. In order to meet your exact requirement, we also design customized t-shirts. We first understand the requirement of our clients and then design the t-shirts accordingly.</p>
<p>We are also considered as the topmost T-shirt Wholesaler in Udaipur because we offer t-shirt in the best wholesale price. If you are looking for the good and premium quality t-shirts then you have arrived absolutely at the right place because we, at The CrossWild, are known for providing quality t-shirt in Udaipur.</p>
<p>By offering superior quality t-shirts, we have been able to build trust among our clients. When it comes to quantity and quality, we always give priority to quality. We are offering elegant and eye-catchy looking t-shirts at a cost-effective price.</p>
<p>We also offer custom jersey t-shirt for different kind of sports events as well as the tournament. Our company also takes bulk order, while we always provide delivery within the stipulated time frame.</p>
<p>Our complete range of t-shirts does not shrink or lose their texture even after many washes, while the optimum quality of the fabric ensures complete comfort and durability.</p>
<h2>Polo T-shirt:</h2>
<p>Being the top t-shirt manufacturer, we are offering a wide range of polo t-shirt in different colours, patterns, styles as well as sizes in order to meet the exact requirement of clients. You can find different eye-catchy polo t-shirts with us at a reasonable price.</p>
<h2>Dry Fit Sports T-shirt:</h2>
<p>You can now avail a wide range of drift as well as promotional t-shirts from us for different events and sports. We can also provide customized t-shirts in order to meet your exact requirement. Our polyester dry fit sports t-shirt is great for the marathon and sports events due to their skin-friendly and water-retaining properties.</p>
<h2>Round Neck T-shirt:</h2>
<p>Be it, women or men, round neck t-shirt is perfect due to its comfortable fit and appealing look. You can also avail this t-shirt in customized options from us at a pocket-friendly price.</p>
<h2>Customized T-shirt:</h2>
<p>If you want to give unique and eye-catchy gifts to your employees then nothing can be better than a customized t-shirt. It is designed from 100% pure cotton fabric, ensuring perfect fitting.</p>`,
  },

  {
    slug: 'tshirt-manufacturer-wholesaler-in-Kota',
    isActive: true,
    h1: 'T-shirt Manufacturing in Kota',
    metaTitle: 'T-Shirt Manufacturer and Wholesaler in Kota - The Crosswild',
    metaDescription: 'Prices start @ Rs 70 only. The Crosswild is a leading t-shirt manufacturer and supplier company in Kota, India. We manufacture customize t-shirts for schools, colleges, events, and promotions at wholesale price.',
    city: 'Kota',
    category: 'tshirt',
    categoryLabel: 'T-Shirt',
    showPrintingMethods: true,
    showFabrics: true,
    showSizeChart: true,
    introContent: `<p>T-shirt is a product that has attracted a lot of attention and has always been popular since it began to be produced in the 1920s. The T-shirt, which was named T-shirt because of the shape of the short-sleeved model, is used as an outerwear and inner wear product today.</p>
<p>These products, which are so widespread and intense use in the world, are among the most preferred textile products of T-shirt manufacturers in Kota in the hot summer seasons. T-shirts, which are loved and worn by every segment, are produced in all sizes and sizes suitable for everyone, from babies to the elderly.</p>
<p>We have types of machinery that empower us to print all custom designs on t-shirts in all types of printing methods. The quality of our fabric and printing is up to the mark that satisfies our customers in their budget.</p>
<p>While printing techniques on the fabric are developing gradually, people find it comfortable to wear t-shirts that they can express themselves. Although the reason for this preference generally comes for economic reasons, the textile industry quickly adapts to this situation.</p>
<p>In individual use, print t-shirts are used for those who want to be different, prefer to carry their own designs or choose to dress in harmony with their loved ones. We, at The Crosswild, as the best T-shirt manufacturing company in Kota provide the service of custom t-shirt or jersey printing that allows customers to get the printed t-shirts they want, all this in a short time period.</p>
<h2>Custom T-Shirt Printing for Events, Schools, Colleges, Promotions and Institutes:</h2>
<p>When ordering a printed t-shirt supplier for college, our customer representatives assist you in deciding on the appropriate size and preparing the ideal t-shirt.</p>
<p>In recent years, T-shirts are among the most popular advertising promotion products. Promotional t-shirts are frequently used as a product that companies distribute in advertising, promotion and promotional activities, as workwear for their employees, and as a selection t-shirt in elections.</p>
<p>The main fabrics that are used by bulk t-shirt suppliers in Kota for the production of T-shirts are 100% cotton, polyester or cotton-polyester blended fabrics. The image and method of printing to be applied on the product affects the fabric selection. While methods such as transfer printing, silkscreen printing, screen printing can be applied more easily on cotton fabric t-shirt models, digital printing techniques can be applied more effectively on polyester fabrics.</p>
<p>We also have business rules that you have developed to ensure product diversity and customer satisfaction by providing T-shirts at wholesale prices. Our rules both increase our business to a more respectable position and increase the quality of our customers' service.</p>
<p>We take care to deliver your products as soon as possible by working as fast as we can in your orders. By properly printing the sweaters, cardigans, and T-shirts you order, we, the best t-shirts manufacturer for school or college provide shipping wherever you order.</p>`,
  },

  {
    slug: 'bags-manufacturing-company-in-Kota',
    isActive: true,
    h1: 'Bags Manufacturing in Kota',
    metaTitle: 'Bags Manufacturer & Suppliers in Kota, India - The Crosswild',
    metaDescription: 'Prices start @ Rs 140 only. The Crosswild is leading manufacturer and wholesale supplier company of bags for School, College, Laptop, Food Delivery, Corporate and Ladies bags at wholesale price in Kota, India.',
    city: 'Kota',
    category: 'bags',
    categoryLabel: 'Bags',
    showPrintingMethods: false,
    showFabrics: false,
    showSizeChart: false,
    introContent: `<p>Are you searching for the best bags manufacturing company in Kota? If yes, then your search ends here. Now bags are considered as the most important accessory which helps in carrying different items in a safe &amp; secure manner. Whether you want the food delivery bags, corporate bags, school bags or college bags, you can get everything with us that too at a very competitive price.</p>
<p>We are known for offering the best quality as well as design bags and also considered as the topmost bags manufacturers in Kota. Among the customers, we are considered the best suppliers for school bags because we never comprise on product quality and also make sure that the bags are delivered within the stipulated time frame. We are indulged in offering foldable and premium quality food delivery bags for different food delivery companies like Swiggy, Zomato, Eat Fit and many more in bulk at a reasonable price. We, at Cross Wild, are considered as the leading bags manufacturer for school &amp; college because we have successfully worked with different educational institutes right from Amity University, Biyani Group of colleges and many more.</p>
<h2>A Preeminent Company Involved in Bags Manufacturing in Kota:</h2>
<p>We offer school bags at wholesale price and are made using quality material to ensure its long life. Our complete range of school bags has high strength due to which students can carry their books &amp; copies easily.</p>
<p>You can find different variety of Corporate (office) bags with us that are not only easy to carry but also maintain. Now carry your office essentials in style in a graceful office bag that has an unmatched finish.</p>
<p>You can now carry your clothes and other essential stuff in a travel bag which looks stylish and elegant at the same time. This bag is available in different sizes and shapes in order to meet your exact demand. It is highly spacious and makes sure that your laptop is completely safe inside.</p>
<p>Delivery bags from small size to large sizes are available with the assurance of the Unbreakable and Lightweight Fabric quality for Food Delivery or for carrying other objects. Customize bag manufacturing options also available according to the customer's needs. Therefore, we are one of the well-known manufacturers of bags who offer customized bags by printing the name and logo of your brand.</p>`,
  },

  {
    slug: 'tshirt-manufacturer-wholesaler-in-sikar',
    isActive: true,
    h1: 'T-shirt Manufacturing in Sikar',
    metaTitle: 'T-Shirt Manufacturer and Wholesaler in Sikar - The Crosswild',
    metaDescription: 'Prices start @ Rs 70 only. The Crosswild is a leading t-shirt manufacturer and supplier company in Sikar, India. We manufacture customize t-shirts for schools, colleges, events, and promotions at wholesale price.',
    city: 'Sikar',
    category: 'tshirt',
    categoryLabel: 'T-Shirt',
    showPrintingMethods: true,
    showFabrics: true,
    showSizeChart: true,
    introContent: `<p>Now order your favourite t-shirt in bulk quantity with a discounted price at The CrossWild. We are recognized as the topmost Tshirt manufacturing company in Sikar where you can find different styles of t-shirt like polo, round neck, promotional, customized and a dry fit sports t-shirt.</p>
<p>In order to design the t-shirts, we make use of quality fabric that ensures complete comfort to the wearer. Manufacturing good quality of Tshirt at wholesale price is our strength and has made us stand out from the crowd.</p>
<p>All the t-shirts that are manufactured at our unit are compacted pre-shrunk as well as comes along with a colour fastness assurance. We also offer custom t-shirt or jersey printing in order to meet the exact requirement of our clients. All the t-shirt manufactured by us stands high on quality and also offer maximum comfort.</p>
<p>Being the foremost Tshirt manufacturer in Sikar, we never compromise on quality because it is one of the major things that have set us apart from the competitors. Our eye-catchy t-shirt range starts from 70 rupees per piece ensuring maximum thread count.</p>
<p>We are also considered as the best t-shirt manufacturer for school or college and sports events such as Marathon, Yoga and Cricket tournament. You can purchase the t-shirts in different styles, colours and sizes from us at a very reasonable price.</p>
<p>The CrossWild is also a leading bulk t-shirt supplier in Sikar because we put all our efforts in order to make the complete range of t-shirt look more attractive. Our t-shirts are a perfect combination of style and class.</p>
<h2>Polo T-shirt:</h2>
<p>Being the top t-shirt manufacturer in Sikar, we provide polo t-shirts in elegant style, colours, sizes as well as patterns. We can also provide custom polo t-shirt on the demand of our clients.</p>
<h2>Round Neck T-shirt:</h2>
<p>Our complete range of round neck t-shirts is impeccable for both men and women. The t-shirts are designed using quality fabric which ensures complete comfort to the wearer.</p>
<h2>Promotional T-shirt:</h2>
<p>We, at The CrossWild, are indulged in offering a wide gamut of promotional t-shirt that look fashionable and elegant at the same time. Even after many washes our offered t-shirt does not shrink or lose its colour. Our promotional t-shirts are known for soft sleeves and lightweight.</p>
<h2>Customized T-shirt:</h2>
<p>If you want to give the finest &amp; innovative gift to your employees then nothing can be better than a customized T-shirt. You can get your brand logo &amp; slogans of artwork get designed on the t-shirt.</p>
<h2>Dry Fit Sports T-shirt:</h2>
<p>Now get the best dry-fit t-shirt for your sports and marathon events that are made using quality fabric. This type of t-shirt is known for its less water retaining properties and skin fit look.</p>`,
  },

  {
    slug: 'bags-manufacturing-company-in-sikar',
    isActive: true,
    h1: 'Bags Manufacturing in Sikar',
    metaTitle: 'Bags Manufacturer & Suppliers in Sikar, India - The Crosswild',
    metaDescription: 'Prices start @ Rs 140 only. The Crosswild is leading manufacturer and wholesale supplier company of bags for School, College, Laptop, Food Delivery, Corporate and Ladies bags at wholesale price in Sikar, India.',
    city: 'Sikar',
    category: 'bags',
    categoryLabel: 'Bags',
    showPrintingMethods: false,
    showFabrics: false,
    showSizeChart: false,
    introContent: `<p>If you are looking for the topmost and best company which is involved in Bags Manufacturing in Sikar then you have arrived absolutely at the right place. The Crosswild Company is indulged in manufacturing a wide assortment of bags at a very reasonable cost.</p>
<p>Being the foremost bags manufacturer in Sikar, our complete collection of bags are designed under the guidance of deft professionals using quality &amp; tough fabrics in order to ensure their long run.</p>
<p>All the bags are coated with special chemicals in order to add strength as well as make them waterproof in nature. Be it corporate (office) bags, school bags, food delivery bags or laptop bags, all are designed perfectly ensuring user-friendly feature along with diverse functionality.</p>
<p>Our food delivery bags are considered as the impeccable combination of style with comfort. Our food delivery bags are unbreakable and foldable, while we offer these bags for different food delivery companies like Swiggy, Zomato, Uber Eats and EatFit at a cost-effective price.</p>
<p>We are recognized as the best bags manufacturing company in Sikar because stand on top on all grounds when compared to other bag manufacturing companies.</p>
<p>All our bags are highly spacious, while we also offer bags in different sizes, styles, designs and colours in order to meet the exact requirement of clients. The bags that are offered at our company can also be labelled with your company name, making it perfect for your corporate office.</p>
<p>Our company is known as the chief bags manufacturer for school &amp; college because we have a group of professionals who have years of experience and superiority of relevant field team to meet the exact requirements of clients. We offer all the bags at wholesale price to our esteemed customers and also assure complete guarantee for handling bulk orders.</p>
<h2>Bag Pack:</h2>
<p>We offer a wide gamut of bag pack in the latest and eye-catchy designs and colours. It is designed using quality fabric which ensures its high strength and enhanced durability. The bag pack comes with quality support straps, making it highly comfortable.</p>
<h2>School Bag:</h2>
<p>The entire collection of school bag is designed using premium quality material and latest machine. It has separate space for keeping notebook and books. You can also purchase customized bags from us.</p>
<h2>Laptop Bag:</h2>
<p>You can buy a different variety of laptop bags from us at a pocket-friendly price. It is highly spacious and keeps your laptop completely safe.</p>
<h2>Gym Bag:</h2>
<p>The entire collection of our gym bag is very good and can easily carry all your gym essentials like an energy drink, clothes, water bottle and many more.</p>`,
  },
];

// ── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    // Auto-detect database from URI, fallback to 'crosswild'
    const dbName = new URL(MONGODB_URI.replace('mongodb+srv://', 'https://'))
      .pathname.replace('/', '') || 'crosswild';
    const db = client.db(dbName);

    // Try both common collection names
    const collectionNames = await db.listCollections().toArray();
    const names = collectionNames.map(c => c.name);
    console.log('Collections found:', names.join(', '));

    const locationCollection =
      names.find(n => n.toLowerCase() === 'locationpages') ||
      names.find(n => n.toLowerCase() === 'locations') ||
      names.find(n => n.toLowerCase().includes('location'));

    if (!locationCollection) {
      console.error('ERROR: Could not find a locations collection. Collections available:', names.join(', '));
      process.exit(1);
    }

    console.log(`Using collection: "${locationCollection}"`);
    const col = db.collection(locationCollection);

    // 1. Delete old docs (case-insensitive slug match)
    const deleteResult = await col.deleteMany({
      slug: { $in: SLUGS_TO_DELETE }
    });
    console.log(`Deleted ${deleteResult.deletedCount} existing location page(s)`);

    // 2. Insert all 13 fresh pages
    const now = new Date();
    const docs = LOCATION_PAGES.map(p => ({ ...p, createdAt: now, updatedAt: now }));
    const insertResult = await col.insertMany(docs);
    console.log(`Inserted ${insertResult.insertedCount} location page(s)`);

    console.log('\nDone! Slugs inserted:');
    LOCATION_PAGES.forEach(p => console.log('  /locations/' + p.slug));

  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
