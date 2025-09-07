import prisma from "../prisma/client.js";

const WEIGHTS = {
  skills: 0.4,
  experience: 0.25,
  portfolio: 0.2,
  reviews: 0.15,
};

const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));

const computeSkillsScore = (jobRequiredSkills = [], userSkills = []) => {
  if (!jobRequiredSkills.length) return 1;
  const required = jobRequiredSkills.map((s) => String(s).toLowerCase().trim());
  const owned = userSkills.map((s) => String(s.skillName).toLowerCase().trim());
  const overlap = required.filter((r) => owned.includes(r)).length;
  return clamp(overlap / required.length);
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

const computeReviewsScore = (reviews = []) => {
  if (!reviews.length) return 0;
  const avg = reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length;
  return clamp(avg / 5);
};

export const scoreFreelancerForJob = (job, freelancer) => {
  const skillsScore = computeSkillsScore(job.requiredSkills, freelancer.skills || []);
  const experienceScore = computeExperienceScore(freelancer.skills || [], job.requiredSkills || []);
  const portfolioScore = computePortfolioScore(freelancer.portfolio || []);
  const reviewsScore = computeReviewsScore(freelancer.reviews || []);
  const total =
    WEIGHTS.skills * skillsScore +
    WEIGHTS.experience * experienceScore +
    WEIGHTS.portfolio * portfolioScore +
    WEIGHTS.reviews * reviewsScore;

  return {
    total: Number((total * 100).toFixed(2)),
    breakdown: {
      skills: Number((skillsScore * 100).toFixed(2)),
      experience: Number((experienceScore * 100).toFixed(2)),
      portfolio: Number((portfolioScore * 100).toFixed(2)),
      reviews: Number((reviewsScore * 100).toFixed(2)),
    },
  };
};

export const getTopMatches = async ({ jobId, limit = 10 }) => {
  const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
  if (!job) return [];

  // Fetch eligible freelancers: users with at least one skill
  const freelancers = await prisma.user.findMany({
    where: { skills: { isEmpty: false } },
    select: {
      id: true,
      username: true,
      fullName: true,
      skills: true,
      portfolio: true,
      reviews: true,
      profileImage: true,
    },
  });

  const scored = freelancers.map((f) => ({
    freelancer: f,
    score: scoreFreelancerForJob(job, f),
  }));

  scored.sort((a, b) => b.score.total - a.score.total);
  return scored.slice(0, limit);
};


