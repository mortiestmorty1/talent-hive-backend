import prisma from "../prisma/client.js";

const WEIGHTS = {
  skillRatings: 0.5,  // Primary: ratings from completed work
  experience: 0.2,     // Secondary: experience level
  portfolio: 0.15,    // Portfolio quality
  overallReviews: 0.15, // Overall review score
};

const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));

/**
 * Calculate skill ratings from completed work reviews
 * Returns a map of skill names to their average ratings
 */
const calculateSkillRatingsFromReviews = (reviews = []) => {
  if (!reviews.length) return {};
  
  const skillRatingMap = {}; // { skillName: { total: number, count: number } }
  
  reviews.forEach((review) => {
    // Handle skillRatings JSON field (new format)
    if (review.skillRatings && typeof review.skillRatings === 'object') {
      Object.entries(review.skillRatings).forEach(([skillName, rating]) => {
        const normalizedSkill = String(skillName).toLowerCase().trim();
        if (typeof rating === 'number' && rating >= 1 && rating <= 5) {
          if (!skillRatingMap[normalizedSkill]) {
            skillRatingMap[normalizedSkill] = { total: 0, count: 0 };
          }
          skillRatingMap[normalizedSkill].total += rating;
          skillRatingMap[normalizedSkill].count += 1;
        }
      });
    }
    
    // Handle legacy skillSpecificRating with skillCategory (backward compatibility)
    if (review.skillSpecificRating && review.skillCategory) {
      const normalizedSkill = String(review.skillCategory).toLowerCase().trim();
      if (review.skillSpecificRating >= 1 && review.skillSpecificRating <= 5) {
        if (!skillRatingMap[normalizedSkill]) {
          skillRatingMap[normalizedSkill] = { total: 0, count: 0 };
        }
        skillRatingMap[normalizedSkill].total += review.skillSpecificRating;
        skillRatingMap[normalizedSkill].count += 1;
      }
    }
  });
  
  // Calculate averages
  const result = {};
  Object.entries(skillRatingMap).forEach(([skillName, data]) => {
    if (data.count > 0) {
      result[skillName] = {
        average: data.total / data.count,
        count: data.count,
      };
    }
  });
  
  return result;
};

/**
 * Compute skill rating score based on completed work reviews
 * This replaces keyword matching with actual performance-based ratings
 */
const computeSkillRatingsScore = (jobRequiredSkills = [], freelancerSkillRatings = {}) => {
  if (!jobRequiredSkills.length) return 1;
  
  const required = jobRequiredSkills.map((s) => String(s).toLowerCase().trim());
  const skillScores = [];
  
  required.forEach((requiredSkill) => {
    // Find matching skill rating (exact match or partial)
    let bestMatch = null;
    let bestScore = 0;
    
    Object.entries(freelancerSkillRatings).forEach(([ratedSkill, ratingData]) => {
      // Exact match
      if (ratedSkill === requiredSkill) {
        bestMatch = ratingData;
        bestScore = ratingData.average / 5; // Normalize to 0-1
      }
      // Partial match (e.g., "react" matches "React.js")
      else if (ratedSkill.includes(requiredSkill) || requiredSkill.includes(ratedSkill)) {
        const matchScore = ratingData.average / 5;
        if (matchScore > bestScore) {
          bestMatch = ratingData;
          bestScore = matchScore;
        }
      }
    });
    
    if (bestMatch) {
      // Weight by number of reviews (more reviews = more reliable)
      const reliabilityFactor = clamp(bestMatch.count / 5, 0.5, 1); // 5+ reviews = max reliability
      skillScores.push(bestScore * reliabilityFactor);
    } else {
      // No rating found for this skill
      skillScores.push(0);
    }
  });
  
  if (skillScores.length === 0) return 0;
  
  // Average of all required skills
  const avgScore = skillScores.reduce((a, b) => a + b, 0) / skillScores.length;
  return clamp(avgScore);
};

const levelToFactor = (level) => {
  switch (level) {
    case "BEGINNER":
      return 0.25;
    case "INTERMEDIATE":
      return 0.5;
    case "ADVANCED":
      return 0.8;
    case "EXPERT":
      return 1;
    default:
      return 0;
  }
};

const computeExperienceScore = (userSkills = [], jobRequiredSkills = []) => {
  if (!jobRequiredSkills.length || !userSkills.length) return 0;
  const required = jobRequiredSkills.map((s) => String(s).toLowerCase().trim());
  const relevant = userSkills.filter((s) => required.includes(String(s.skillName).toLowerCase().trim()));
  if (!relevant.length) return 0;
  const avgLevel = relevant.reduce((acc, s) => acc + levelToFactor(s.level), 0) / relevant.length;
  const avgYears = relevant.reduce((acc, s) => acc + (s.yearsOfExperience || 0), 0) / relevant.length;
  // Normalize years: 0-10+ => 0-1
  const yearsFactor = clamp(avgYears / 10);
  return clamp(0.7 * avgLevel + 0.3 * yearsFactor);
};

const computePortfolioScore = (portfolio = []) => {
  if (!portfolio.length) return 0;
  const countFactor = clamp(portfolio.length / 10); // 10+ items max
  // Quality proxy: description length + images count
  let quality = 0;
  portfolio.forEach((p) => {
    const descScore = clamp(((p.description || "").length) / 300);
    const imagesScore = clamp(((p.imageUrls || []).length) / 5);
    quality += 0.5 * descScore + 0.5 * imagesScore;
  });
  quality = clamp(quality / portfolio.length);
  return clamp(0.5 * countFactor + 0.5 * quality);
};

const computeOverallReviewsScore = (reviews = []) => {
  if (!reviews.length) return 0;
  const avg = reviews.reduce((acc, r) => acc + (r.overallRating || r.rating || 0), 0) / reviews.length;
  return clamp(avg / 5);
};

/**
 * Score freelancer for a job using rating-based matching
 * Primary factor: Skill ratings from completed work
 * Secondary factors: Experience, portfolio, overall reviews
 */
export const scoreFreelancerForJob = (job, freelancer) => {
  // Calculate skill ratings from completed work reviews
  const skillRatings = calculateSkillRatingsFromReviews(freelancer.reviews || []);
  
  // Compute scores
  const skillRatingsScore = computeSkillRatingsScore(job.requiredSkills || [], skillRatings);
  const experienceScore = computeExperienceScore(freelancer.skills || [], job.requiredSkills || []);
  const portfolioScore = computePortfolioScore(freelancer.portfolio || []);
  const overallReviewsScore = computeOverallReviewsScore(freelancer.reviews || []);
  
  // Calculate weighted total
  const total =
    WEIGHTS.skillRatings * skillRatingsScore +
    WEIGHTS.experience * experienceScore +
    WEIGHTS.portfolio * portfolioScore +
    WEIGHTS.overallReviews * overallReviewsScore;

  return {
    total: Number((total * 100).toFixed(2)),
    breakdown: {
      skillRatings: Number((skillRatingsScore * 100).toFixed(2)),
      experience: Number((experienceScore * 100).toFixed(2)),
      portfolio: Number((portfolioScore * 100).toFixed(2)),
      overallReviews: Number((overallReviewsScore * 100).toFixed(2)),
    },
    skillRatings: skillRatings, // Include for debugging/display
  };
};

export const getTopMatches = async ({ jobId, limit = 10 }) => {
  const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
  if (!job) return [];

  // Fetch eligible freelancers (must have at least one skill)
  const freelancers = await prisma.user.findMany({
    where: { 
      skills: { isEmpty: false }
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      skills: true,
      portfolio: true,
      profileImage: true,
    },
  });

  // Fetch reviews for each freelancer separately
  // Reviews are about the freelancer (not by them):
  // - Gig reviews: where gig.userId === freelancer.id
  // - Job reviews: where job.acceptedFreelancerId === freelancer.id
  const freelancerIds = freelancers.map(f => f.id);
  
  // Get gig reviews for these freelancers
  const gigReviews = await prisma.reviews.findMany({
    where: {
      verifiedPurchase: true,
      gigId: { not: null },
      gig: {
        userId: { in: freelancerIds }
      }
    },
    select: {
      id: true,
      gigId: true,
      jobId: true,
      skillRatings: true,
      skillSpecificRating: true,
      skillCategory: true,
      overallRating: true,
      rating: true,
      communicationRating: true,
      timelinessRating: true,
      qualityRating: true,
      comment: true,
      createdAt: true,
      reviewer: {
        select: {
          id: true,
          username: true,
          fullName: true,
          profileImage: true
        }
      },
      gig: {
        select: {
          userId: true  // To map back to freelancer
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Get job reviews for these freelancers
  const jobReviews = await prisma.reviews.findMany({
    where: {
      verifiedPurchase: true,
      jobId: { not: null },
      job: {
        acceptedFreelancerId: { in: freelancerIds }
      }
    },
    select: {
      id: true,
      gigId: true,
      jobId: true,
      skillRatings: true,
      skillSpecificRating: true,
      skillCategory: true,
      overallRating: true,
      rating: true,
      communicationRating: true,
      timelinessRating: true,
      qualityRating: true,
      comment: true,
      createdAt: true,
      reviewer: {
        select: {
          id: true,
          username: true,
          fullName: true,
          profileImage: true
        }
      },
      job: {
        select: {
          acceptedFreelancerId: true  // To map back to freelancer
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Group reviews by freelancer ID
  const reviewsByFreelancer = {};
  
  // Process gig reviews
  gigReviews.forEach(review => {
    const freelancerId = review.gig?.userId;
    if (freelancerId) {
      if (!reviewsByFreelancer[freelancerId]) {
        reviewsByFreelancer[freelancerId] = [];
      }
      reviewsByFreelancer[freelancerId].push(review);
    }
  });

  // Process job reviews
  jobReviews.forEach(review => {
    const freelancerId = review.job?.acceptedFreelancerId;
    if (freelancerId) {
      if (!reviewsByFreelancer[freelancerId]) {
        reviewsByFreelancer[freelancerId] = [];
      }
      reviewsByFreelancer[freelancerId].push(review);
    }
  });

  // Sort reviews by date for each freelancer
  Object.keys(reviewsByFreelancer).forEach(freelancerId => {
    reviewsByFreelancer[freelancerId].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  });

  // Score each freelancer with their reviews
  const scored = freelancers.map((f) => {
    // Attach reviews to freelancer object for scoring
    const freelancerWithReviews = {
      ...f,
      reviews: reviewsByFreelancer[f.id] || []
    };
    
    const matchScore = scoreFreelancerForJob(job, freelancerWithReviews);
    
    // Calculate review statistics
    const reviews = freelancerWithReviews.reviews || [];
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + (r.overallRating || r.rating || 0), 0) / totalReviews
      : 0;
    
    // Get recent reviews (last 3)
    const recentReviews = reviews.slice(0, 3);
    
    return {
      freelancer: f,
      score: matchScore,
      reviewStats: {
        totalReviews,
        averageRating: Number(averageRating.toFixed(2)),
        recentReviews: recentReviews.map(r => ({
          id: r.id,
          rating: r.overallRating || r.rating,
          comment: r.comment,
          skillRatings: r.skillRatings,
          communicationRating: r.communicationRating,
          timelinessRating: r.timelinessRating,
          qualityRating: r.qualityRating,
          reviewer: r.reviewer,
          createdAt: r.createdAt,
          gigId: r.gigId,  // Include to identify if it's a gig review
          jobId: r.jobId   // Include to identify if it's a job review
        }))
      }
    };
  });

  // Sort by total score (rating-based matching)
  scored.sort((a, b) => b.score.total - a.score.total);
  return scored.slice(0, limit);
};


