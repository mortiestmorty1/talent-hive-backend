import prisma from "../prisma/client.js";
import { getTopMatches } from "../services/MatchingService.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createJob = async (req, res) => {
  try {
    const { title, description, requiredSkills, budget, timeline, complexity } = req.body;
    if (!title || !description || !Array.isArray(requiredSkills) || !requiredSkills.length || !budget || !timeline || !complexity) {
      return res.status(400).send("Missing required fields");
    }

    const job = await prisma.jobPosting.create({
      data: {
        title,
        description,
        requiredSkills,
        budget: Number(budget),
        timeline,
        complexity,
        clientId: req.userId,
      },
    });
    return res.status(201).json(job);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

export const applyToJob = async (req, res) => {
  try {
    const { jobId, proposal, bidAmount, timeline } = req.body;
    if (!jobId || !proposal || !bidAmount || !timeline) return res.status(400).send("Missing required fields");
    
    const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).send("Job not found");

    // Prevent users from applying to their own jobs
    if (job.clientId === req.userId) {
      return res.status(400).send("You cannot apply to your own job");
    }

    // Check if user has already applied to this job
    const existingApplication = await prisma.application.findFirst({
      where: {
        jobId,
        freelancerId: req.userId
      }
    });

    if (existingApplication) {
      return res.status(400).send("You have already applied to this job");
    }

    const application = await prisma.application.create({
      data: {
        jobId,
        freelancerId: req.userId,
        proposal,
        bidAmount: Number(bidAmount),
        timeline,
      },
    });
    return res.status(201).json(application);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

export const getJobTopMatches = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { limit } = req.query;
    const top = await getTopMatches({ jobId, limit: limit ? Number(limit) : 10 });
    return res.status(200).json(top);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

export const getJobById = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Validate jobId format (MongoDB ObjectId should be 24 characters)
    if (!jobId || jobId.length !== 24) {
      return res.status(400).json({ error: "Invalid job ID format" });
    }
    
    const job = await prisma.jobPosting.findUnique({ 
      where: { id: jobId },
      include: {
        client: true,
        applications: {
          include: {
            freelancer: true
          }
        },
        reviews: {
          include: {
            reviewer: true
          }
        }
      }
    });
    
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    
    return res.status(200).json(job);
  } catch (error) {
    console.error("Error in getJobById:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

export const listClientJobs = async (req, res) => {
  try {
    const jobs = await prisma.jobPosting.findMany({ 
      where: { clientId: req.userId }, 
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { applications: true }
        }
      }
    });
    return res.status(200).json(jobs);
  } catch (error) {
    console.error("Error in listClientJobs:", error);
    return res.status(500).send("Internal Server Error");
  }
};

export const browseAllJobs = async (req, res) => {
  try {
    const { category, complexity, minBudget, maxBudget, timeline } = req.query;
    
    let whereCondition = {
      // Only show OPEN jobs (not in progress, completed, etc.)
      status: 'OPEN'
    };
    
    // Only exclude user's own jobs if they are logged in
    if (req.userId) {
      whereCondition.clientId = {
        not: req.userId
      };
    }

    // Add category filter
    if (category && category !== 'all') {
      whereCondition.OR = [
        { title: { contains: category, mode: 'insensitive' } },
        { description: { contains: category, mode: 'insensitive' } },
        { requiredSkills: { hasSome: [category] } }
      ];
    }

    // Add complexity filter
    if (complexity && complexity !== 'all') {
      whereCondition.complexity = complexity.toUpperCase();
    }

    // Add budget filters
    if (minBudget || maxBudget) {
      whereCondition.budget = {};
      if (minBudget) whereCondition.budget.gte = Number(minBudget);
      if (maxBudget) whereCondition.budget.lte = Number(maxBudget);
    }

    // Add timeline filter
    if (timeline && timeline !== 'all') {
      const timelineLower = timeline.toLowerCase();
      switch (timelineLower) {
        case 'less-than-1-week':
          whereCondition.timeline = {
            contains: 'day',
            mode: 'insensitive'
          };
          break;
        case '1-4-weeks':
          whereCondition.timeline = {
            contains: 'week',
            mode: 'insensitive'
          };
          break;
        case '1-3-months':
          whereCondition.timeline = {
            contains: 'month',
            mode: 'insensitive'
          };
          break;
        case 'more-than-3-months':
          whereCondition.timeline = {
            contains: 'month',
            mode: 'insensitive'
          };
          break;
      }
    }

    const jobs = await prisma.jobPosting.findMany({ 
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: {
            fullName: true,
            username: true
          }
        }
      }
    });
    return res.status(200).json({ jobs });
  } catch (error) {
    console.error("Error in browseAllJobs:", error);
    return res.status(500).send("Internal Server Error");
  }
};

export const getAllJobs = async (req, res) => {
  try {
    let whereCondition = {};
    
    // Only show OPEN jobs (not in progress, completed, etc.)
    whereCondition.status = 'OPEN';
    
    // Only exclude user's own jobs if they are logged in
    if (req.userId) {
      whereCondition.clientId = {
        not: req.userId
      };
    }

    const jobs = await prisma.jobPosting.findMany({
      where: whereCondition,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        client: {
          select: {
            fullName: true,
            username: true
          }
        }
      }
    });
    
    return res.status(200).json({ jobs });
  } catch (error) {
    console.error("Error in getAllJobs:", error);
    return res.status(500).send("Internal Server Error");
  }
};

export const searchJobs = async (req, res) => {
  try {
    const { searchTerm, category, complexity, minBudget, maxBudget, timeline } = req.query;
    
    if (!searchTerm && !category && !complexity && !minBudget && !maxBudget && !timeline) {
      return res.status(400).send("At least one search parameter is required.");
    }

    let whereCondition = {
      // Only show OPEN jobs (not in progress, completed, etc.)
      status: 'OPEN'
    };
    
    // Only exclude user's own jobs if they are logged in
    if (req.userId) {
      whereCondition.clientId = {
        not: req.userId
      };
    }

    // Add search conditions
    const orConditions = [];
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      orConditions.push(
        { title: { contains: searchLower, mode: 'insensitive' } },
        { description: { contains: searchLower, mode: 'insensitive' } }
      );
      
      // For skills, we'll search for exact matches and common variations
      const skillVariations = [
        searchTerm,
        searchLower,
        searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1),
        searchTerm.toUpperCase()
      ];
      
      // Add common skill variations (e.g., "node" should match "Node.js")
      if (searchLower === 'node') {
        skillVariations.push('Node.js', 'node.js', 'NODE.JS');
      }
      if (searchLower === 'react') {
        skillVariations.push('React', 'REACT');
      }
      if (searchLower === 'javascript') {
        skillVariations.push('JavaScript', 'JAVASCRIPT', 'JS', 'js');
      }
      if (searchLower === 'mongodb') {
        skillVariations.push('MongoDB', 'MONGODB', 'mongo', 'Mongo');
      }
      if (searchLower === 'python') {
        skillVariations.push('Python', 'PYTHON');
      }
      if (searchLower === 'php') {
        skillVariations.push('PHP', 'php');
      }
      if (searchLower === 'wordpress') {
        skillVariations.push('WordPress', 'wordpress', 'WORDPRESS');
      }
      if (searchLower === 'design') {
        skillVariations.push('UI/UX', 'Design', 'Figma', 'Adobe XD', 'Photoshop', 'Illustrator');
      }
      if (searchLower === 'marketing') {
        skillVariations.push('Social Media Marketing', 'Marketing', 'SEO', 'Facebook Ads', 'Instagram Marketing');
      }
      if (searchLower === 'devops') {
        skillVariations.push('DevOps', 'Docker', 'Jenkins', 'AWS', 'Linux');
      }
      if (searchLower === 'blockchain') {
        skillVariations.push('Blockchain', 'Solidity', 'Ethereum', 'Smart Contracts', 'Web3.js');
      }
      
      // Add semantic search mappings for broader terms
      if (searchLower === 'web development' || searchLower === 'web dev' || searchLower === 'web') {
        skillVariations.push('React', 'Node.js', 'JavaScript', 'HTML', 'CSS', 'Frontend', 'Backend', 'Full Stack');
        // Also search in title and description for web-related terms
        orConditions.push(
          { title: { contains: 'web', mode: 'insensitive' } },
          { title: { contains: 'frontend', mode: 'insensitive' } },
          { title: { contains: 'backend', mode: 'insensitive' } },
          { title: { contains: 'full stack', mode: 'insensitive' } },
          { description: { contains: 'web', mode: 'insensitive' } },
          { description: { contains: 'frontend', mode: 'insensitive' } },
          { description: { contains: 'backend', mode: 'insensitive' } },
          { description: { contains: 'full stack', mode: 'insensitive' } }
        );
      }
      if (searchLower === 'programming' || searchLower === 'coding' || searchLower === 'development') {
        skillVariations.push('React', 'Node.js', 'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'MongoDB', 'MySQL');
      }
      if (searchLower === 'design' || searchLower === 'ui' || searchLower === 'ux') {
        skillVariations.push('UI/UX', 'Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'Design', 'Prototyping');
      }
      if (searchLower === 'marketing' || searchLower === 'seo' || searchLower === 'social media') {
        skillVariations.push('Social Media Marketing', 'SEO', 'Facebook Ads', 'Instagram Marketing', 'Content Creation', 'Analytics');
      }
      if (searchLower === 'data science' || searchLower === 'machine learning' || searchLower === 'ai') {
        skillVariations.push('Python', 'TensorFlow', 'Pandas', 'Scikit-learn', 'Machine Learning', 'Data Analytics', 'Jupyter');
      }
      if (searchLower === 'mobile app' || searchLower === 'mobile development') {
        skillVariations.push('React Native', 'Flutter', 'iOS', 'Android', 'Mobile Development', 'Mobile Design');
      }
      
      // Add each variation as a separate condition
      skillVariations.forEach(variation => {
        orConditions.push({ requiredSkills: { hasSome: [variation] } });
      });
    }

    if (category) {
      orConditions.push(
        { title: { contains: category, mode: 'insensitive' } },
        { description: { contains: category, mode: 'insensitive' } },
        { requiredSkills: { hasSome: [category] } }
      );
    }

    if (orConditions.length > 0) {
      whereCondition.OR = orConditions;
    }

    // Add complexity filter
    if (complexity) {
      whereCondition.complexity = complexity.toUpperCase();
    }

    // Add budget filters
    if (minBudget || maxBudget) {
      whereCondition.budget = {};
      if (minBudget) whereCondition.budget.gte = Number(minBudget);
      if (maxBudget) whereCondition.budget.lte = Number(maxBudget);
    }

    // Add timeline filter
    if (timeline && timeline !== 'all') {
      const timelineLower = timeline.toLowerCase();
      switch (timelineLower) {
        case 'less-than-1-week':
          whereCondition.timeline = {
            contains: 'day',
            mode: 'insensitive'
          };
          break;
        case '1-4-weeks':
          whereCondition.timeline = {
            contains: 'week',
            mode: 'insensitive'
          };
          break;
        case '1-3-months':
          whereCondition.timeline = {
            contains: 'month',
            mode: 'insensitive'
          };
          break;
        case 'more-than-3-months':
          whereCondition.timeline = {
            contains: 'month',
            mode: 'insensitive'
          };
          break;
      }
    }

    const jobs = await prisma.jobPosting.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: {
            fullName: true,
            username: true
          }
        }
      }
    });

    return res.status(200).json({ jobs });
  } catch (error) {
    console.error("Error in searchJobs:", error);
    return res.status(500).send("Internal Server Error");
  }
};

export const getJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // First verify that the job belongs to the current user
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId }
    });
    
    if (!job) {
      return res.status(404).send("Job not found");
    }
    
    // Check if user is authorized to view applications
    const isClient = job.clientId === req.userId;
    const isAcceptedFreelancer = job.acceptedFreelancerId === req.userId;
    
    console.log("=== APPLICATION AUTHORIZATION DEBUG ===");
    console.log("Job Client ID:", job.clientId);
    console.log("Job Accepted Freelancer ID:", job.acceptedFreelancerId);
    console.log("User ID:", req.userId);
    console.log("isClient:", isClient);
    console.log("isAcceptedFreelancer:", isAcceptedFreelancer);

    if (!isClient && !isAcceptedFreelancer) {
      console.log("❌ User not authorized to view applications");
      return res.status(403).send("You are not authorized to view applications for this job");
    }
    
    const applications = await prisma.application.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
      include: {
        freelancer: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            profileImage: true
          }
        }
      }
    });
    
    return res.status(200).json(applications);
  } catch (error) {
    console.error("Error in getJobApplications:", error);
    return res.status(500).send("Internal Server Error");
  }
};

export const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;
    
    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      return res.status(400).send("Invalid status. Must be ACCEPTED or REJECTED");
    }
    
    // Get the application with job information
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
        freelancer: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true
          }
        }
      }
    });
    
    if (!application) {
      return res.status(404).send("Application not found");
    }
    
    // Verify that the job belongs to the current user
    if (application.job.clientId !== req.userId) {
      return res.status(403).send("You can only update applications for your own jobs");
    }
    
    // Check if job is already closed
    if (application.job.status === 'IN_PROGRESS') {
      return res.status(400).send("Job has already been assigned to a freelancer");
    }
    
    // If accepting an application
    if (status === 'ACCEPTED') {
      // Update the job status to IN_PROGRESS and set accepted freelancer
      await prisma.jobPosting.update({
        where: { id: application.jobId },
        data: {
          status: 'IN_PROGRESS',
          acceptedFreelancerId: application.freelancerId
        }
      });
      
      // Reject all other pending applications for this job
      await prisma.application.updateMany({
        where: {
          jobId: application.jobId,
          id: { not: applicationId },
          status: 'PENDING'
        },
        data: { status: 'REJECTED' }
      });
    }
    
    // Update the application status
    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: { status },
      include: {
        freelancer: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true
          }
        }
      }
    });
    
    return res.status(200).json(updatedApplication);
  } catch (error) {
    console.error("Error in updateApplicationStatus:", error);
    return res.status(500).send("Internal Server Error");
  }
};

// Get job orders for client (jobs they posted with accepted freelancers)
export const getClientJobOrders = async (req, res) => {
  try {
    const jobOrders = await prisma.jobPosting.findMany({
      where: {
        clientId: req.userId,
        status: { in: ['IN_PROGRESS', 'PENDING_COMPLETION', 'COMPLETED'] }
      },
      include: {
        applications: {
          where: { status: 'ACCEPTED' },
          include: {
            freelancer: {
              select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                profileImage: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ orders: jobOrders });
  } catch (error) {
    console.error("Error in getClientJobOrders:", error);
    return res.status(500).send("Internal Server Error");
  }
};

// Get job orders for freelancer (jobs they were accepted for)
export const getFreelancerJobOrders = async (req, res) => {
  try {
    const jobOrders = await prisma.application.findMany({
      where: {
        freelancerId: req.userId,
        status: 'ACCEPTED',
        job: {
          status: { in: ['IN_PROGRESS', 'PENDING_COMPLETION', 'COMPLETED'] }
        }
      },
      include: {
        job: {
          include: {
            client: {
              select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                profileImage: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ orders: jobOrders });
  } catch (error) {
    console.error("Error in getFreelancerJobOrders:", error);
    return res.status(500).send("Internal Server Error");
  }
};

// Complete a job (mark as completed)
export const completeJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Get the job and verify ownership
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: {
        applications: {
          where: { status: 'ACCEPTED' },
          include: {
            freelancer: {
              select: {
                id: true,
                username: true,
                fullName: true
              }
            }
          }
        }
      }
    });
    
    if (!job) {
      return res.status(404).send("Job not found");
    }
    
    if (job.clientId !== req.userId) {
      return res.status(403).send("You can only complete your own jobs");
    }
    
    if (job.status !== 'IN_PROGRESS') {
      return res.status(400).send("Job must be in progress to be completed");
    }
    
    if (!job.applications.length) {
      return res.status(400).send("No accepted freelancer found for this job");
    }
    
    // Update job status to completed
    const updatedJob = await prisma.jobPosting.update({
      where: { id: jobId },
      data: { status: 'COMPLETED' },
      include: {
        applications: {
          where: { status: 'ACCEPTED' },
          include: {
            freelancer: {
              select: {
                id: true,
                username: true,
                fullName: true
              }
            }
          }
        }
      }
    });
    
    return res.status(200).json({ 
      message: "Job completed successfully",
      job: updatedJob
    });
  } catch (error) {
    console.error("Error in completeJob:", error);
    return res.status(500).send("Internal Server Error");
  }
};

// Check if user can review a job (client who completed the job)
const checkJobCompletion = async (userId, jobId) => {
  try {
    const job = await prisma.jobPosting.findFirst({
      where: {
        id: jobId,
        clientId: userId,
        status: 'COMPLETED'
      }
    });
    return !!job;
  } catch (err) {
    console.log(err);
    return false;
  }
};

// Add review for a job
export const addJobReview = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!req.userId || !jobId) {
      return res.status(400).send("User ID and Job ID are required");
    }
    
    // Check if user can review this job
    const canReview = await checkJobCompletion(req.userId, jobId);
    if (!canReview) {
      return res.status(400).send("You can only review jobs you have completed");
    }
    
    // Check if user already reviewed this job
    const existingReview = await prisma.reviews.findFirst({
      where: {
        jobId: jobId,
        reviewerId: req.userId
      }
    });
    
    if (existingReview) {
      return res.status(400).send("You have already reviewed this job");
    }
    
    if (!req.body.reviewText || !req.body.overallRating) {
      return res.status(400).send("Review text and overall rating are required");
    }
    
    const rating = parseInt(req.body.overallRating);
    const skillSpecificRating = req.body.skillSpecificRating ? parseInt(req.body.skillSpecificRating) : undefined;
    const communicationRating = req.body.communicationRating ? parseInt(req.body.communicationRating) : undefined;
    const timelinessRating = req.body.timelinessRating ? parseInt(req.body.timelinessRating) : undefined;
    const qualityRating = req.body.qualityRating ? parseInt(req.body.qualityRating) : undefined;
    
    const newReview = await prisma.reviews.create({
      data: {
        rating: rating,
        overallRating: rating,
        skillSpecificRating,
        communicationRating,
        timelinessRating,
        qualityRating,
        skillCategory: req.body.skillCategory,
        verifiedPurchase: true,
        comment: req.body.reviewText,
        reviewer: { connect: { id: req.userId } },
        job: { connect: { id: jobId } },
      },
      include: {
        reviewer: {
          select: {
            id: true,
            username: true,
            fullName: true,
            profileImage: true
          }
        }
      },
    });
    
    return res.status(201).json({ newReview });
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
};

// Get freelancer's completed jobs (for freelancer to see their completed work)
export const getFreelancerCompletedJobs = async (req, res) => {
  try {
    const completedJobs = await prisma.jobPosting.findMany({
      where: {
        acceptedFreelancerId: req.userId,
        status: 'COMPLETED'
      },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            fullName: true,
            profileImage: true
          }
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                username: true,
                fullName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return res.status(200).json({ completedJobs });
  } catch (error) {
    console.error("Error in getFreelancerCompletedJobs:", error);
    return res.status(500).send("Internal Server Error");
  }
};

// Create job payment
export const createJobPayment = async (req, res) => {
  try {
    console.log("=== CREATE JOB PAYMENT DEBUG START ===");
    console.log("Request body:", req.body);
    console.log("User ID:", req.userId);

    const { jobId, applicationId } = req.body;

    if (!jobId || !applicationId) {
      return res.status(400).json({ error: "Job ID and Application ID are required." });
    }

    // Find the job and application
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { client: true }
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found." });
    }

    // Verify the user is the client who posted the job
    if (job.clientId !== req.userId) {
      return res.status(403).json({ error: "You can only pay for your own jobs." });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { freelancer: true }
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found." });
    }

    // Verify the application belongs to this job
    if (application.jobId !== jobId) {
      return res.status(400).json({ error: "Application does not belong to this job." });
    }

    // Verify the application is accepted
    if (application.status !== 'ACCEPTED') {
      return res.status(400).json({ error: "Can only pay for accepted applications." });
    }

    const amount = application.bidAmount * 100; // Convert to cents

    console.log("Creating payment intent for job:", job.title);
    console.log("Amount:", amount);
    console.log("Freelancer:", application.freelancer.fullName);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      metadata: {
        jobId: jobId,
        applicationId: applicationId,
        type: 'job_payment'
      }
    });

    console.log("Created payment intent:", paymentIntent.id);

    // Create job order record
    const jobOrder = await prisma.jobOrder.create({
      data: {
        jobId: jobId,
        applicationId: applicationId,
        clientId: req.userId,
        freelancerId: application.freelancerId,
        amount: application.bidAmount,
        paymentIntent: paymentIntent.id,
        status: 'PENDING'
      }
    });

    console.log("Created job order:", jobOrder.id);
    console.log("=== CREATE JOB PAYMENT DEBUG END ===");

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      jobOrder: jobOrder
    });

  } catch (error) {
    console.error("=== CREATE JOB PAYMENT ERROR ===");
    console.error("Error creating job payment:", error);
    return res.status(500).json({ error: "Internal Server Error.", details: error.message });
  }
};

// Confirm job payment
export const confirmJobPayment = async (req, res) => {
  try {
    console.log("=== CONFIRM JOB PAYMENT DEBUG START ===");
    console.log("Request body:", req.body);
    console.log("User ID:", req.userId);

    const { paymentIntent } = req.body;

    if (!paymentIntent) {
      return res.status(400).json({ error: "Payment intent ID is required." });
    }

    // Verify payment intent with Stripe
    const stripePaymentIntent = await stripe.paymentIntents.retrieve(paymentIntent);
    console.log("Payment intent status:", stripePaymentIntent.status);

    if (stripePaymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        error: "Payment not completed.", 
        status: stripePaymentIntent.status 
      });
    }

    // Find the job order
    const jobOrder = await prisma.jobOrder.findUnique({
      where: { paymentIntent: paymentIntent },
      include: {
        job: true,
        application: true,
        client: true,
        freelancer: true
      }
    });

    if (!jobOrder) {
      return res.status(404).json({ error: "Job order not found." });
    }

    console.log("Found job order:", jobOrder.id);

    // Update job order status
    const updatedJobOrder = await prisma.jobOrder.update({
      where: { id: jobOrder.id },
      data: { 
        status: 'PAID',
        paidAt: new Date()
      },
      include: {
        job: true,
        application: true,
        client: true,
        freelancer: true
      }
    });

    // Update application status to IN_PROGRESS
    await prisma.application.update({
      where: { id: jobOrder.applicationId },
      data: { status: 'IN_PROGRESS' }
    });

    // Update job status to IN_PROGRESS
    await prisma.jobPosting.update({
      where: { id: jobOrder.jobId },
      data: { status: 'IN_PROGRESS' }
    });

    console.log("Job payment confirmed and status updated");
    console.log("=== CONFIRM JOB PAYMENT DEBUG END ===");

    return res.status(200).json({
      message: "Job payment confirmed successfully.",
      jobOrder: updatedJobOrder
    });

  } catch (error) {
    console.error("=== CONFIRM JOB PAYMENT ERROR ===");
    console.error("Error confirming job payment:", error);
    return res.status(500).json({ error: "Internal Server Error.", details: error.message });
  }
};

// Update job status
export const updateJobStatus = async (req, res) => {
  try {
    console.log("=== UPDATE JOB STATUS DEBUG START ===");
    console.log("Job ID:", req.params.jobId);
    console.log("Request body:", req.body);
    console.log("User ID:", req.userId);

    const { status } = req.body;
    const { jobId } = req.params;

    if (!status) {
      return res.status(400).json({ error: "Status is required." });
    }

    // Find the job
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { 
        client: true,
        applications: {
          include: {
            freelancer: true
          }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found." });
    }

    // Verify the user is authorized to update the status
    const isBuyer = job.clientId === req.userId;
    const isSeller = job.applications.some(app => app.freelancerId === req.userId && (app.status === 'ACCEPTED' || app.status === 'IN_PROGRESS'));
    const isAcceptedFreelancer = job.acceptedFreelancerId === req.userId;

    console.log("=== AUTHORIZATION DEBUG ===");
    console.log("User ID:", req.userId);
    console.log("Job Client ID:", job.clientId);
    console.log("Job Accepted Freelancer ID:", job.acceptedFreelancerId);
    console.log("Job Applications:", job.applications.map(app => ({ id: app.id, freelancerId: app.freelancerId, status: app.status })));
    console.log("isBuyer:", isBuyer);
    console.log("isSeller:", isSeller);
    console.log("isAcceptedFreelancer:", isAcceptedFreelancer);

    if (!isBuyer && !isSeller && !isAcceptedFreelancer) {
      console.log("❌ Authorization failed - user not authorized");
      return res.status(403).json({ error: "You are not authorized to update this job status." });
    }

    // Define allowed status transitions
    const allowedTransitions = {
      'IN_PROGRESS': {
        seller: ['PENDING_COMPLETION'], // Seller can request completion
        buyer: ['CANCELLED'] // Buyer can cancel
      },
      'PENDING_COMPLETION': {
        seller: [], // Seller cannot change status from pending
        buyer: ['COMPLETED', 'IN_PROGRESS'] // Buyer can approve or reject
      },
      'COMPLETED': {
        seller: [], // No changes after completion
        buyer: [] // No changes after completion
      }
    };

    const userRole = isBuyer ? 'buyer' : (isSeller || isAcceptedFreelancer) ? 'seller' : 'unknown';
    const currentStatus = job.status;
    
    if (!allowedTransitions[currentStatus] || !allowedTransitions[currentStatus][userRole].includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status transition. ${userRole} cannot change status from ${currentStatus} to ${status}.` 
      });
    }

    // Update job status
    const updatedJob = await prisma.jobPosting.update({
      where: { id: jobId },
      data: { status: status },
      include: {
        client: true,
        applications: {
          include: {
            freelancer: true
          }
        }
      }
    });

    console.log("Job status updated:", updatedJob.id, "to", status);
    console.log("=== UPDATE JOB STATUS DEBUG END ===");

    const message = status === 'PENDING_COMPLETION' 
      ? "Job completion request submitted. Waiting for buyer approval."
      : status === 'COMPLETED'
      ? "Job completion approved!"
      : status === 'IN_PROGRESS'
      ? "Job completion rejected. Work continues."
      : "Job status updated successfully.";

    return res.status(200).json({
      message,
      job: updatedJob
    });

  } catch (error) {
    console.error("=== UPDATE JOB STATUS ERROR ===");
    console.error("Error updating job status:", error);
    return res.status(500).json({ error: "Internal Server Error.", details: error.message });
  }
};

// Update job progress
export const updateJobProgress = async (req, res) => {
  try {
    console.log("=== UPDATE JOB PROGRESS DEBUG START ===");
    console.log("Job ID:", req.params.jobId);
    console.log("Request body:", req.body);
    console.log("User ID:", req.userId);

    const { progress } = req.body;
    const { jobId } = req.params;

    if (progress === undefined || progress < 0 || progress > 100) {
      return res.status(400).json({ error: "Progress must be between 0 and 100." });
    }

    // Find the job
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { 
        applications: {
          where: { freelancerId: req.userId }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found." });
    }

    // Check if user is the freelancer working on this job
    const userApplication = job.applications.find(app => app.freelancerId === req.userId);
    if (!userApplication || userApplication.status !== 'IN_PROGRESS') {
      return res.status(403).json({ error: "You can only update progress for jobs you're working on." });
    }

    // Update job progress
    const updatedJob = await prisma.jobPosting.update({
      where: { id: jobId },
      data: { progress: progress },
      include: {
        client: true,
        applications: {
          include: {
            freelancer: true
          }
        }
      }
    });

    console.log("Job progress updated:", updatedJob.id, "to", progress);
    console.log("=== UPDATE JOB PROGRESS DEBUG END ===");

    return res.status(200).json({
      message: "Job progress updated successfully.",
      progress: progress,
      job: updatedJob
    });

  } catch (error) {
    console.error("=== UPDATE JOB PROGRESS ERROR ===");
    console.error("Error updating job progress:", error);
    return res.status(500).json({ error: "Internal Server Error.", details: error.message });
  }
};

// Get job milestones
export const getJobMilestones = async (req, res) => {
  try {
    const { jobId } = req.params;

    const milestones = await prisma.jobMilestone.findMany({
      where: { jobId: jobId },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ milestones });

  } catch (error) {
    console.error("Error fetching job milestones:", error);
    return res.status(500).json({ error: "Internal Server Error.", details: error.message });
  }
};

// Add job milestone
export const addJobMilestone = async (req, res) => {
  try {
    console.log("=== ADD JOB MILESTONE DEBUG START ===");
    console.log("Job ID:", req.params.jobId);
    console.log("Request body:", req.body);
    console.log("User ID:", req.userId);

    const { title, description } = req.body;
    const { jobId } = req.params;

    if (!title || !description || !title.trim() || !description.trim()) {
      return res.status(400).json({ error: "Title and description are required." });
    }

    // Find the job
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { 
        applications: {
          where: { freelancerId: req.userId }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found." });
    }

    // Check if user is the freelancer working on this job
    const userApplication = job.applications.find(app => app.freelancerId === req.userId);
    if (!userApplication || userApplication.status !== 'IN_PROGRESS') {
      return res.status(403).json({ error: "You can only add milestones for jobs you're working on." });
    }

    // Create milestone
    const milestone = await prisma.jobMilestone.create({
      data: {
        jobId: jobId,
        title: title.trim(),
        description: description.trim(),
        status: 'PENDING'
      }
    });

    console.log("Milestone created:", milestone.id);
    console.log("=== ADD JOB MILESTONE DEBUG END ===");

    return res.status(200).json({
      message: "Milestone added successfully.",
      milestone: milestone
    });

  } catch (error) {
    console.error("=== ADD JOB MILESTONE ERROR ===");
    console.error("Error adding job milestone:", error);
    return res.status(500).json({ error: "Internal Server Error.", details: error.message });
  }
};

// Update milestone status
export const updateMilestoneStatus = async (req, res) => {
  try {
    console.log("=== UPDATE MILESTONE STATUS DEBUG START ===");
    console.log("Milestone ID:", req.params.milestoneId);
    console.log("Request body:", req.body);
    console.log("User ID:", req.userId);

    const { status } = req.body;
    const { milestoneId } = req.params;

    if (!status || !['PENDING', 'IN_PROGRESS', 'PENDING_COMPLETION', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ error: "Valid status is required." });
    }

    // Find the milestone
    const milestone = await prisma.jobMilestone.findUnique({
      where: { id: milestoneId },
      include: {
        job: {
          include: {
            client: true,
            applications: {
              include: {
                freelancer: true
              }
            }
          }
        }
      }
    });

    if (!milestone) {
      return res.status(404).json({ error: "Milestone not found." });
    }

    // Determine user role
    const isClient = milestone.job.clientId === req.userId;
    const isFreelancer = milestone.job.applications.some(app => app.freelancerId === req.userId && app.status === 'IN_PROGRESS');

    if (!isClient && !isFreelancer) {
      return res.status(403).json({ error: "You can only update milestones for your own jobs." });
    }

    // Validate status transitions based on user role
    const currentStatus = milestone.status;
    const allowedTransitions = {
      'PENDING': {
        freelancer: ['IN_PROGRESS'],
        client: []
      },
      'IN_PROGRESS': {
        freelancer: ['PENDING_COMPLETION'],
        client: []
      },
      'PENDING_COMPLETION': {
        freelancer: [],
        client: ['COMPLETED', 'IN_PROGRESS']
      },
      'COMPLETED': {
        freelancer: [],
        client: []
      }
    };

    const userRole = isClient ? 'client' : 'freelancer';
    if (!allowedTransitions[currentStatus] || !allowedTransitions[currentStatus][userRole].includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status transition. ${userRole} cannot change status from ${currentStatus} to ${status}.` 
      });
    }

    // Update milestone status
    const updatedMilestone = await prisma.jobMilestone.update({
      where: { id: milestoneId },
      data: { 
        status: status,
        progress: status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? 50 : 0
      }
    });

    console.log("Milestone status updated:", updatedMilestone.id, "to", status);
    console.log("=== UPDATE MILESTONE STATUS DEBUG END ===");

    return res.status(200).json({
      message: "Milestone status updated successfully.",
      milestone: updatedMilestone
    });

  } catch (error) {
    console.error("=== UPDATE MILESTONE STATUS ERROR ===");
    console.error("Error updating milestone status:", error);
    return res.status(500).json({ error: "Internal Server Error.", details: error.message });
  }
};




