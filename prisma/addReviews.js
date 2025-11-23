import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

/**
 * Script to add sample reviews with skill ratings to existing accounts
 * This helps test the rating-based matching system
 */
async function createSampleCompletedWork(sellers, buyers) {
  console.log('Creating sample completed work...');
  
  // Get or create some gigs
  let gigs = await prisma.gig.findMany({ take: 10 });
  
  if (gigs.length === 0) {
    // Create some sample gigs
    const seller = sellers[0];
    if (!seller) return { orders: [], jobs: [] };
    
    gigs = await Promise.all([
      prisma.gig.create({
        data: {
          title: "I will build a modern React web application",
          description: "Full-stack React application with Redux, Node.js backend, and database integration",
          category: "Web Development",
          deliveryTime: 7,
          revisions: 3,
          features: ['Premium Quality', 'Fast Delivery'],
          price: 500,
          shortDesc: "Modern React app",
          images: [],
          createdBy: { connect: { id: seller.id } },
        },
      }),
      prisma.gig.create({
        data: {
          title: "I will create a responsive WordPress website",
          description: "Professional WordPress development with custom themes",
          category: "Web Development",
          deliveryTime: 5,
          revisions: 2,
          features: ['Premium Quality'],
          price: 300,
          shortDesc: "WordPress website",
          images: [],
          createdBy: { connect: { id: seller.id } },
        },
      }),
    ]);
  }

  // Create completed orders
  const orders = [];
  let paymentCounter = 2000;
  
  for (let i = 0; i < Math.min(5, gigs.length); i++) {
    const buyer = buyers[i % buyers.length];
    const gig = gigs[i];
    
    const order = await prisma.order.create({
      data: {
        buyerId: buyer.id,
        paymentIntent: `pi_sample_${paymentCounter++}`,
        isCompleted: true,
        status: 'COMPLETED',
        gigId: gig.id,
        price: Math.floor(gig.price),
      },
    });
    orders.push(order);
  }

  // Create completed jobs
  const jobs = [];
  const jobTemplates = [
    {
      title: "E-commerce Website Development",
      description: "Need a full-stack developer to build a modern e-commerce platform",
      requiredSkills: ["React", "Node.js", "MongoDB"],
      budget: 2000,
      timeline: "1-2 months",
      complexity: "HIGH"
    },
    {
      title: "API Development and Integration",
      description: "Develop RESTful APIs and integrate with third-party services",
      requiredSkills: ["Node.js", "Express", "MongoDB"],
      budget: 800,
      timeline: "2-4 weeks",
      complexity: "MEDIUM"
    },
  ];

  for (const template of jobTemplates.slice(0, 2)) {
    const client = buyers[0];
    const freelancer = sellers[0];
    
    const job = await prisma.jobPosting.create({
      data: {
        title: template.title,
        description: template.description,
        requiredSkills: template.requiredSkills,
        budget: template.budget,
        timeline: template.timeline,
        complexity: template.complexity,
        status: 'COMPLETED',
        clientId: client.id,
        acceptedFreelancerId: freelancer.id,
      },
    });

    // Create accepted application
    await prisma.application.create({
      data: {
        jobId: job.id,
        freelancerId: freelancer.id,
        proposal: 'I can deliver this with high quality.',
        bidAmount: template.budget * 0.9,
        timeline: template.timeline,
        status: 'ACCEPTED',
      },
    });

    jobs.push(job);
  }

  return { orders, jobs };
}

async function addReviewsWithSkillRatings() {
  console.log('Adding reviews with skill ratings...');

  // Get all users
  const users = await prisma.user.findMany();
  console.log(`📊 Found ${users.length} users in database`);
  
  const sellers = users.filter(u => u.skills && u.skills.length > 0);
  const buyers = users.filter(u => !u.skills || u.skills.length === 0);
  
  console.log(`👥 Sellers: ${sellers.length}, Buyers: ${buyers.length}`);

  if (sellers.length === 0 || buyers.length === 0) {
    console.log('⚠️  Need at least one seller and one buyer. Run "npm run db:seed" first.');
    console.log('💡 Tip: Run "npm run db:seed" to create sample users, gigs, and jobs.');
    return;
  }

  // Get completed orders
  let completedOrders = await prisma.order.findMany({
    where: {
      OR: [
        { isCompleted: true },
        { status: 'COMPLETED' }
      ]
    },
    include: {
      gig: true
    }
  });

  // Get completed jobs
  let completedJobs = await prisma.jobPosting.findMany({
    where: {
      status: 'COMPLETED'
    },
    include: {
      client: true,
      applications: {
        where: {
          status: 'ACCEPTED'
        },
        include: {
          freelancer: true
        }
      }
    }
  });

  // If no completed work exists, create some sample data
  if (completedOrders.length === 0 && completedJobs.length === 0) {
    console.log('📝 No completed work found. Creating sample completed orders and jobs...');
    
    // Get or create some gigs
    let gigs = await prisma.gig.findMany({ take: 5 });
    console.log(`📦 Found ${gigs.length} existing gigs`);
    
    if (gigs.length === 0 && sellers.length > 0) {
      console.log('Creating sample gigs...');
      const seller = sellers[0];
      gigs = await Promise.all([
        prisma.gig.create({
          data: {
            title: "I will build a modern React web application",
            description: "Full-stack React application with Redux, Node.js backend, and database integration",
            category: "Web Development",
            deliveryTime: 7,
            revisions: 3,
            features: ['Premium Quality', 'Fast Delivery'],
            price: 500,
            shortDesc: "Modern React app",
            images: [],
            createdBy: { connect: { id: seller.id } },
          },
        }),
        prisma.gig.create({
          data: {
            title: "I will create a responsive WordPress website",
            description: "Professional WordPress development with custom themes",
            category: "Web Development",
            deliveryTime: 5,
            revisions: 2,
            features: ['Premium Quality'],
            price: 300,
            shortDesc: "WordPress website",
            images: [],
            createdBy: { connect: { id: seller.id } },
          },
        }),
      ]);
      console.log(`✅ Created ${gigs.length} gigs`);
    }

    // Create completed orders
    if (gigs.length > 0 && buyers.length > 0) {
      console.log('Creating completed orders...');
      let paymentCounter = 2000;
      const newOrders = [];
      
      for (let i = 0; i < Math.min(3, gigs.length); i++) {
        const buyer = buyers[i % buyers.length];
        const gig = gigs[i];
        
        const order = await prisma.order.create({
          data: {
            buyerId: buyer.id,
            paymentIntent: `pi_sample_${paymentCounter++}`,
            isCompleted: true,
            status: 'COMPLETED',
            gigId: gig.id,
            price: Math.floor(gig.price),
          },
        });
        newOrders.push(order);
      }

      // Reload completed orders
      completedOrders = await prisma.order.findMany({
        where: { id: { in: newOrders.map(o => o.id) } },
        include: { gig: true }
      });
      console.log(`✅ Created ${completedOrders.length} completed orders`);
    }

    // Create completed jobs
    if (sellers.length > 0 && buyers.length > 0) {
      console.log('Creating completed jobs...');
      const jobTemplates = [
        {
          title: "E-commerce Website Development",
          description: "Need a full-stack developer to build a modern e-commerce platform",
          requiredSkills: ["React", "Node.js", "MongoDB"],
          budget: 2000,
          timeline: "1-2 months",
          complexity: "HIGH"
        },
        {
          title: "API Development and Integration",
          description: "Develop RESTful APIs and integrate with third-party services",
          requiredSkills: ["Node.js", "Express", "MongoDB"],
          budget: 800,
          timeline: "2-4 weeks",
          complexity: "MEDIUM"
        },
      ];

      const newJobs = [];
      for (const template of jobTemplates.slice(0, 2)) {
        const client = buyers[0];
        const freelancer = sellers[0];
        
        const job = await prisma.jobPosting.create({
          data: {
            title: template.title,
            description: template.description,
            requiredSkills: template.requiredSkills,
            budget: template.budget,
            timeline: template.timeline,
            complexity: template.complexity,
            status: 'COMPLETED',
            clientId: client.id,
            acceptedFreelancerId: freelancer.id,
          },
        });

        // Create accepted application
        await prisma.application.create({
          data: {
            jobId: job.id,
            freelancerId: freelancer.id,
            proposal: 'I can deliver this with high quality.',
            bidAmount: template.budget * 0.9,
            timeline: template.timeline,
            status: 'ACCEPTED',
          },
        });

        newJobs.push(job);
      }

      // Reload completed jobs
      completedJobs = await prisma.jobPosting.findMany({
        where: { id: { in: newJobs.map(j => j.id) } },
        include: {
          client: true,
          applications: {
            where: { status: 'ACCEPTED' },
            include: { freelancer: true }
          }
        }
      });
      console.log(`✅ Created ${completedJobs.length} completed jobs`);
    }
    
    console.log(`✅ Created ${completedOrders.length} completed orders and ${completedJobs.length} completed jobs`);
  } else {
    console.log(`📦 Found ${completedOrders.length} completed orders and ${completedJobs.length} completed jobs`);
  }

  // Skill mappings for different categories
  const categorySkills = {
    'Web Development': ['React', 'Node.js', 'JavaScript', 'MongoDB', 'CSS', 'HTML', 'Next.js', 'Express'],
    'Graphic Design': ['Photoshop', 'Illustrator', 'UI/UX', 'Design', 'Typography', 'Figma', 'Adobe XD'],
    'Writing & Translation': ['Writing', 'SEO', 'Content Creation', 'Editing', 'Copywriting'],
    'Digital Marketing': ['SEO', 'Social Media', 'Analytics', 'Marketing', 'Facebook Ads', 'Google Ads'],
    'Video & Animation': ['Video Editing', 'After Effects', 'Animation', 'Motion Graphics', 'Premiere Pro'],
    'Data': ['Python', 'Data Analysis', 'Excel', 'SQL', 'Pandas', 'Data Visualization'],
    'Music & Audio': ['Audio Mixing', 'Sound Design', 'Music Production', 'Pro Tools'],
    'Programming & Tech': ['Python', 'JavaScript', 'API Development', 'Backend', 'Node.js', 'Express']
  };

  const jobSkillMappings = {
    'E-commerce Website Development': ['React', 'Node.js', 'MongoDB', 'Stripe', 'Tailwind CSS'],
    'Mobile App UI/UX Design': ['Figma', 'Adobe XD', 'UI/UX', 'Prototyping', 'Mobile Design'],
    'WordPress Website Customization': ['WordPress', 'PHP', 'CSS', 'JavaScript', 'MySQL'],
    'Data Analytics Dashboard': ['Python', 'React', 'D3.js', 'PostgreSQL', 'Chart.js'],
    'API Development and Integration': ['Node.js', 'Express', 'MongoDB', 'JWT', 'REST API']
  };

  let reviewsAdded = 0;
  let skippedReviews = 0;

  console.log(`\n📝 Processing ${completedOrders.length} completed orders and ${completedJobs.length} completed jobs...`);

  // Add reviews for completed gig orders
  for (const order of completedOrders.slice(0, 10)) {
    // Check if review already exists
    const existingReview = await prisma.reviews.findFirst({
      where: {
        gigId: order.gigId,
        reviewerId: order.buyerId
      }
    });

    if (existingReview) {
      skippedReviews++;
      continue;
    }

    const gig = order.gig;
    const availableSkills = categorySkills[gig.category] || ['General'];
    const numSkillsToRate = rand(2, Math.min(4, availableSkills.length));
    const selectedSkills = availableSkills.slice(0, numSkillsToRate);
    
    const skillRatings = {};
    selectedSkills.forEach(skill => {
      skillRatings[skill] = rand(4, 5); // High ratings for seed data
    });

    const communicationRating = rand(4, 5);
    const timelinessRating = rand(4, 5);
    const qualityRating = rand(4, 5);
    const overall = Math.round(
      (Object.values(skillRatings).reduce((a, b) => a + b, 0) / Object.values(skillRatings).length + 
       communicationRating + timelinessRating + qualityRating) / 4
    );

    const comments = [
      'Excellent work! Very professional and delivered on time.',
      'Great collaboration. The freelancer understood the requirements perfectly.',
      'Outstanding quality. Would definitely work with again.',
      'Very satisfied with the results. Highly recommended!',
      'Professional service with great attention to detail.',
      'Exceeded expectations. The work was completed ahead of schedule.',
      'Top-notch quality and excellent communication throughout.',
      'Very skilled freelancer. Delivered exactly what was promised.'
    ];

    await prisma.reviews.create({
      data: {
        rating: overall,
        overallRating: overall,
        skillSpecificRating: Math.round(Object.values(skillRatings).reduce((a, b) => a + b, 0) / Object.values(skillRatings).length),
        communicationRating,
        timelinessRating,
        qualityRating,
        skillCategory: pick(['Frontend', 'Backend', 'Design', 'Full Stack']),
        skillRatings: skillRatings,
        verifiedPurchase: true,
        comment: pick(comments),
        reviewer: { connect: { id: order.buyerId } },
        gig: { connect: { id: order.gigId } },
      },
    });

    reviewsAdded++;
  }

  // Add reviews for completed jobs
  for (const job of completedJobs.slice(0, 10)) {
    if (job.applications.length === 0) continue;

    const application = job.applications[0];
    const freelancer = application.freelancer;

    // Check if review already exists
    const existingReview = await prisma.reviews.findFirst({
      where: {
        jobId: job.id,
        reviewerId: job.clientId
      }
    });

    if (existingReview) {
      skippedReviews++;
      continue;
    }

    // Get skills from job requirements
    const jobSkills = job.requiredSkills || [];
    const skillRatings = {};
    
    // Rate each required skill
    jobSkills.slice(0, Math.min(5, jobSkills.length)).forEach(skill => {
      skillRatings[skill] = rand(4, 5); // High ratings for seed data
    });

    const communicationRating = rand(4, 5);
    const timelinessRating = rand(4, 5);
    const qualityRating = rand(4, 5);
    const overall = Math.round(
      (Object.values(skillRatings).reduce((a, b) => a + b, 0) / Object.values(skillRatings).length + 
       communicationRating + timelinessRating + qualityRating) / 4
    );

    const comments = [
      'Excellent work on this project! The freelancer demonstrated strong skills in all required areas.',
      'Very professional and skilled. Delivered high-quality work on time.',
      'Outstanding performance. Would definitely hire again for similar projects.',
      'Great technical skills and excellent communication throughout the project.',
      'Exceeded expectations. The freelancer showed expertise in all the required technologies.'
    ];

    await prisma.reviews.create({
      data: {
        rating: overall,
        overallRating: overall,
        skillSpecificRating: Math.round(Object.values(skillRatings).reduce((a, b) => a + b, 0) / Object.values(skillRatings).length),
        communicationRating,
        timelinessRating,
        qualityRating,
        skillCategory: job.requiredSkills?.[0] || 'General',
        skillRatings: skillRatings,
        verifiedPurchase: true,
        comment: pick(comments),
        reviewer: { connect: { id: job.clientId } },
        job: { connect: { id: job.id } },
      },
    });

    reviewsAdded++;
  }

  if (reviewsAdded === 0) {
    console.log(`\n⚠️  No new reviews were added.`);
    if (skippedReviews > 0) {
      console.log(`   - ${skippedReviews} completed work items already have reviews`);
    }
    if (completedOrders.length === 0 && completedJobs.length === 0) {
      console.log('   - No completed orders or jobs found');
      console.log('   - Run "npm run db:seed" first to create sample data');
    }
  } else {
    console.log(`\n✅ Successfully added ${reviewsAdded} reviews with skill ratings!`);
    if (skippedReviews > 0) {
      console.log(`   (Skipped ${skippedReviews} items that already had reviews)`);
    }
    console.log('These reviews will now be used for rating-based matching.');
  }
}

async function main() {
  try {
    await addReviewsWithSkillRatings();
  } catch (error) {
    console.error('Error adding reviews:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

