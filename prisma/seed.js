import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SKILLS = [
  { name: 'React', level: 'ADVANCED' },
  { name: 'Node.js', level: 'ADVANCED' },
  { name: 'MongoDB', level: 'INTERMEDIATE' },
  { name: 'Next.js', level: 'ADVANCED' },
  { name: 'Tailwind', level: 'ADVANCED' },
  { name: 'DevOps', level: 'INTERMEDIATE' },
  { name: 'UI/UX', level: 'INTERMEDIATE' },
];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

async function createUsers() {
  const users = [];
  const salt = await bcrypt.genSalt();
  const hashed = await bcrypt.hash('password123', salt);

  // Mediators
  for (let i = 1; i <= 2; i++) {
    users.push(await prisma.user.create({
      data: {
        email: `mediator${i}@example.com`,
        password: hashed,
        username: `mediator${i}`,
        fullName: `Mediator ${i}`,
        description: 'Official mediator',
        isProfileInfoSet: true,
        isMediator: true,
      },
    }));
  }

  // Sellers
  for (let i = 1; i <= 5; i++) {
    users.push(await prisma.user.create({
      data: {
        email: `seller${i}@example.com`,
        password: hashed,
        username: `seller${i}`,
        fullName: `Seller ${i}`,
        description: 'Experienced freelancer',
        isProfileInfoSet: true,
        skills: Array.from({ length: rand(2, 4) }).map(() => ({
          skillName: pick(SKILLS).name,
          level: pick(['BEGINNER','INTERMEDIATE','ADVANCED','EXPERT']),
          yearsOfExperience: rand(1, 10),
          certifications: [
            { name: 'Certification A', issuer: 'Org A' },
          ],
        })),
        portfolio: Array.from({ length: rand(1, 3) }).map((_, j) => ({
          title: `Project ${i}-${j+1}`,
          description: 'Sample portfolio item',
          imageUrls: [],
          projectUrl: 'https://example.com',
          technologies: ['React', 'Node'],
        })),
      },
    }));
  }

  // Buyers
  for (let i = 1; i <= 5; i++) {
    users.push(await prisma.user.create({
      data: {
        email: `buyer${i}@example.com`,
        password: hashed,
        username: `buyer${i}`,
        fullName: `Buyer ${i}`,
        description: 'Client looking to hire',
        isProfileInfoSet: true,
      },
    }));
  }

  return users;
}

async function createGigsAndOrders(users) {
  const sellers = users.filter((u) => u.username?.startsWith('seller'));
  const buyers = users.filter((u) => u.username?.startsWith('buyer'));
  const gigs = [];
  const orders = [];

  // Define image mappings for different categories
  const categoryImages = {
    'Web Development': ['service1.png', 'service2.jpeg', 'service3.jpeg', 'business.png'],
    'Graphic Design': ['service4.jpeg', 'service5.jpeg', 'service6.jpeg', 'demo.webp'],
    'Writing & Translation': ['service7.jpeg', 'service8.jpeg', 'everything.jpg'],
    'Digital Marketing': ['service1.png', 'service2.jpeg', 'service3.jpeg', 'business.png'],
    'Video & Animation': ['service4.jpeg', 'service5.jpeg', 'demo.webp'],
    'Data': ['service6.jpeg', 'service7.jpeg', 'service8.jpeg'],
    'Music & Audio': ['service1.png', 'service2.jpeg', 'service3.jpeg'],
    'Programming & Tech': ['service4.jpeg', 'service5.jpeg', 'service6.jpeg', 'Pokedex.png', 'nextportfolio.png']
  };

  const getRandomImages = (category, count = 2) => {
    const images = categoryImages[category] || categoryImages['Web Development'];
    const shuffled = shuffleArray([...images]);
    return shuffled.slice(0, Math.min(count, images.length));
  };

  // Create realistic gigs with varied content
  const gigTemplates = [
    // Web Development
    { title: "I will create a responsive WordPress website", category: "Web Development", desc: "Professional WordPress development with custom themes, responsive design, and SEO optimization", shortDesc: "Custom WordPress website with modern design", price: [200, 800], delivery: [5, 14] },
    { title: "I will build a modern React web application", category: "Web Development", desc: "Full-stack React application with Redux, Node.js backend, and database integration", shortDesc: "Modern React app with full functionality", price: [400, 1200], delivery: [7, 21] },
    { title: "I will develop a custom e-commerce website", category: "Web Development", desc: "Complete e-commerce solution with payment integration, inventory management, and admin panel", shortDesc: "Full e-commerce website with payment gateway", price: [500, 1500], delivery: [10, 30] },
    { title: "I will fix bugs in your existing website", category: "Web Development", desc: "Quick bug fixes, performance optimization, and code improvements for any website", shortDesc: "Website bug fixes and optimization", price: [50, 200], delivery: [1, 5] },
    { title: "I will create a landing page that converts", category: "Web Development", desc: "High-converting landing page with modern design, fast loading, and mobile optimization", shortDesc: "Converting landing page design", price: [150, 400], delivery: [3, 7] },
    
    // Graphic Design
    { title: "I will design a professional logo for your brand", category: "Graphic Design", desc: "Creative logo design with multiple concepts, unlimited revisions, and all file formats", shortDesc: "Professional logo design with revisions", price: [80, 300], delivery: [2, 7] },
    { title: "I will create stunning social media graphics", category: "Graphic Design", desc: "Eye-catching social media posts, stories, and covers for all platforms", shortDesc: "Social media graphics pack", price: [40, 150], delivery: [1, 3] },
    { title: "I will design a complete brand identity package", category: "Graphic Design", desc: "Complete branding including logo, business cards, letterhead, and brand guidelines", shortDesc: "Complete brand identity design", price: [200, 600], delivery: [5, 14] },
    { title: "I will create professional business cards", category: "Graphic Design", desc: "Modern business card design with premium layouts and printing-ready files", shortDesc: "Professional business card design", price: [30, 100], delivery: [1, 3] },
    { title: "I will design an attractive flyer or poster", category: "Graphic Design", desc: "Eye-catching promotional materials for events, businesses, or campaigns", shortDesc: "Custom flyer and poster design", price: [25, 80], delivery: [1, 3] },
    
    // Writing & Translation
    { title: "I will write SEO optimized blog articles", category: "Writing & Translation", desc: "Well-researched, engaging blog posts optimized for search engines and readers", shortDesc: "SEO blog writing service", price: [50, 200], delivery: [2, 7] },
    { title: "I will proofread and edit your content", category: "Writing & Translation", desc: "Professional proofreading and editing for grammar, style, and clarity", shortDesc: "Professional proofreading service", price: [20, 100], delivery: [1, 3] },
    { title: "I will translate content in multiple languages", category: "Writing & Translation", desc: "Accurate translation services for documents, websites, and marketing materials", shortDesc: "Professional translation service", price: [30, 150], delivery: [2, 5] },
    { title: "I will write compelling product descriptions", category: "Writing & Translation", desc: "Persuasive product descriptions that increase conversions and sales", shortDesc: "Converting product descriptions", price: [40, 120], delivery: [1, 4] },
    
    // Digital Marketing
    { title: "I will manage your social media accounts", category: "Digital Marketing", desc: "Complete social media management including content creation, posting, and engagement", shortDesc: "Social media management service", price: [200, 800], delivery: [7, 30] },
    { title: "I will run effective Facebook ad campaigns", category: "Digital Marketing", desc: "Targeted Facebook advertising campaigns with optimization and detailed reporting", shortDesc: "Facebook ads management", price: [150, 500], delivery: [3, 14] },
    { title: "I will improve your website SEO ranking", category: "Digital Marketing", desc: "Complete SEO optimization including keyword research, on-page, and link building", shortDesc: "Website SEO optimization", price: [100, 400], delivery: [7, 21] },
    { title: "I will create a digital marketing strategy", category: "Digital Marketing", desc: "Comprehensive marketing strategy with actionable plans and growth tactics", shortDesc: "Digital marketing strategy plan", price: [200, 600], delivery: [5, 10] },
    
    // Video & Animation
    { title: "I will edit your videos professionally", category: "Video & Animation", desc: "Professional video editing with transitions, effects, color grading, and audio sync", shortDesc: "Professional video editing", price: [100, 400], delivery: [3, 10] },
    { title: "I will create animated explainer videos", category: "Video & Animation", desc: "Engaging animated videos that explain your product or service clearly", shortDesc: "Animated explainer videos", price: [200, 800], delivery: [7, 14] },
    { title: "I will design motion graphics and animations", category: "Video & Animation", desc: "Custom motion graphics for videos, presentations, and digital content", shortDesc: "Motion graphics design", price: [150, 500], delivery: [5, 12] },
    
    // Data & Analytics
    { title: "I will create interactive data visualizations", category: "Data", desc: "Professional charts, graphs, and dashboards using Tableau, Power BI, or D3.js", shortDesc: "Data visualization and dashboards", price: [150, 500], delivery: [3, 10] },
    { title: "I will analyze your business data", category: "Data", desc: "Comprehensive data analysis with insights, trends, and actionable recommendations", shortDesc: "Business data analysis", price: [200, 600], delivery: [5, 14] },
    { title: "I will build automated Excel solutions", category: "Data", desc: "Advanced Excel formulas, macros, and automated reporting solutions", shortDesc: "Excel automation and formulas", price: [80, 300], delivery: [2, 7] },
    
    // Music & Audio
    { title: "I will mix and master your music tracks", category: "Music & Audio", desc: "Professional audio mixing and mastering for radio-ready sound quality", shortDesc: "Music mixing and mastering", price: [100, 400], delivery: [3, 10] },
    { title: "I will record professional voiceovers", category: "Music & Audio", desc: "High-quality voiceover recording for commercials, videos, and presentations", shortDesc: "Professional voiceover recording", price: [60, 250], delivery: [2, 5] },
    
    // Programming & Tech
    { title: "I will develop Python automation scripts", category: "Programming & Tech", desc: "Custom Python scripts for automation, data processing, and workflow optimization", shortDesc: "Python automation development", price: [100, 400], delivery: [3, 10] },
    { title: "I will create mobile apps for iOS and Android", category: "Programming & Tech", desc: "Native mobile app development with modern UI and full functionality", shortDesc: "Mobile app development", price: [800, 2500], delivery: [14, 45] },
    { title: "I will integrate APIs and databases", category: "Programming & Tech", desc: "API integration, database setup, and backend development services", shortDesc: "API and database integration", price: [200, 600], delivery: [5, 14] },
  ];

  for (const seller of sellers) {
    // Each seller gets 4-6 random gigs
    const numGigs = rand(4, 6);
    const selectedGigs = shuffleArray([...gigTemplates]).slice(0, numGigs);
    
    for (const gigTemplate of selectedGigs) {
      const priceRange = gigTemplate.price;
      const deliveryRange = gigTemplate.delivery;
      
      const gig = await prisma.gig.create({
        data: {
          title: gigTemplate.title,
          description: gigTemplate.desc,
          category: gigTemplate.category,
          deliveryTime: rand(deliveryRange[0], deliveryRange[1]),
          revisions: rand(1, 5),
          features: ['Premium Quality', 'Fast Delivery', '24/7 Support', 'Unlimited Revisions'].slice(0, rand(2, 4)),
          price: rand(priceRange[0], priceRange[1]),
          shortDesc: gigTemplate.shortDesc,
          images: getRandomImages(gigTemplate.category, rand(1, 3)),
          createdBy: { connect: { id: seller.id } },
        },
      });
      gigs.push(gig);
    }
  }

  // Add some additional popular gigs to make the platform feel alive
  const popularCategories = ['Web Development', 'Graphic Design', 'Digital Marketing', 'Writing & Translation'];
  for (let i = 0; i < 15; i++) {
    const seller = pick(sellers);
    const template = pick(gigTemplates.filter(g => popularCategories.includes(g.category)));
    const priceRange = template.price;
    const deliveryRange = template.delivery;
    
    const gig = await prisma.gig.create({
      data: {
        title: template.title + ` (Premium)`,
        description: template.desc + " Premium service with extra attention to detail and faster delivery.",
        category: template.category,
        deliveryTime: rand(deliveryRange[0], deliveryRange[1]),
        revisions: rand(2, 6),
        features: ['Premium Quality', 'Express Delivery', 'Priority Support', 'Unlimited Revisions', 'Money Back Guarantee'].slice(0, rand(3, 5)),
        price: rand(Math.floor(priceRange[1] * 0.8), Math.floor(priceRange[1] * 1.5)),
        shortDesc: template.shortDesc + " - Premium Service",
        images: getRandomImages(template.category, rand(2, 4)),
        createdBy: { connect: { id: seller.id } },
      },
    });
    gigs.push(gig);
  }

  // Create orders and mark random ones completed
  let paymentCounter = 1000;
  for (let i = 0; i < 12; i++) {
    const buyer = pick(buyers);
    const gig = pick(gigs);
    const order = await prisma.order.create({
      data: {
        buyerId: buyer.id,
        paymentIntent: `pi_seed_${paymentCounter++}`,
        isCompleted: Math.random() > 0.3,
        gigId: gig.id,
        price: Math.floor(gig.price),
      },
    });
    orders.push(order);
  }

  return { gigs, orders };
}

async function createReviews(gigs, orders) {
  const buyersById = new Map();
  for (const o of orders) buyersById.set(o.id, o.buyerId);

  for (const gig of gigs) {
    const related = orders.filter((o) => o.gigId === gig.id && o.isCompleted);
    for (const ord of related.slice(0, 2)) {
      const ratings = {
        skillSpecificRating: rand(3, 5),
        communicationRating: rand(3, 5),
        timelinessRating: rand(3, 5),
        qualityRating: rand(3, 5),
      };
      const overall = Math.round((ratings.skillSpecificRating + ratings.communicationRating + ratings.timelinessRating + ratings.qualityRating) / 4);
      await prisma.reviews.create({
        data: {
          rating: overall,
          overallRating: overall,
          ...ratings,
          skillCategory: pick(['Frontend','Backend','Design']),
          verifiedPurchase: true,
          comment: 'Great collaboration!',
          reviewer: { connect: { id: buyersById.get(ord.id) } },
          gig: { connect: { id: gig.id } },
        },
      });
    }
  }
}

async function createJobsAndApplications(users) {
  const clients = users.filter((u) => u.username?.startsWith('buyer'));
  const freelancers = users.filter((u) => u.username?.startsWith('seller'));
  const jobs = [];

  for (let i = 1; i <= 5; i++) {
    const job = await prisma.jobPosting.create({
      data: {
        title: `Project ${i}: Build Feature`,
        description: 'Looking for an expert to build a feature',
        requiredSkills: ['React','Node.js','MongoDB'].slice(0, rand(1, 3)),
        budget: rand(200, 2000),
        timeline: pick(['1-2 weeks','2-4 weeks','1-2 months']),
        complexity: pick(['LOW','MEDIUM','HIGH']),
        clientId: pick(clients).id,
      },
    });
    jobs.push(job);
  }

  for (const job of jobs) {
    for (let i = 0; i < rand(2, 4); i++) {
      const fl = pick(freelancers);
      await prisma.application.create({
        data: {
          jobId: job.id,
          freelancerId: fl.id,
          proposal: 'I can deliver this with high quality.',
          bidAmount: rand(150, 1800),
          timeline: pick(['1-2 weeks','2-4 weeks']),
        },
      });
    }
  }
}

async function createDisputes(users, orders) {
  const mediators = users.filter((u) => u.isMediator);
  if (!mediators.length) return;
  for (const ord of orders.slice(0, 3)) {
    const dispute = await prisma.dispute.create({
      data: {
        orderId: ord.id,
        initiatorId: ord.buyerId,
        reason: 'Service not as expected',
        description: 'Requesting mediation to resolve the issue',
        evidence: [],
        status: 'UNDER_REVIEW',
        mediatorId: pick(mediators).id,
      },
    });
    await prisma.disputeMessage.create({ data: { disputeId: dispute.id, senderId: ord.buyerId, text: 'I would like a partial refund.' } });
  }
}

async function main() {
  console.log('Seeding database...');
  // Delete in correct order due to relations
  await prisma.messages.deleteMany({});
  await prisma.reviews.deleteMany({});
  await prisma.application.deleteMany({});
  await prisma.jobPosting.deleteMany({});
  await prisma.disputeMessage.deleteMany({});
  await prisma.dispute.deleteMany({});
  await prisma.gigMilestone.deleteMany({});
  await prisma.jobMilestone.deleteMany({});
  await prisma.jobOrder.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.gig.deleteMany({});
  await prisma.user.deleteMany({});

  const users = await createUsers();
  const { gigs, orders } = await createGigsAndOrders(users);
  await createReviews(gigs, orders);
  await createJobsAndApplications(users);
  await createDisputes(users, orders);
  console.log('Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });


