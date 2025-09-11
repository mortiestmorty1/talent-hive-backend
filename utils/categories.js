// Standardized categories for jobs and gigs
export const JOB_CATEGORIES = {
  WEB_DEVELOPMENT: 'Web Development',
  MOBILE_DEVELOPMENT: 'Mobile Development',
  DESKTOP_DEVELOPMENT: 'Desktop Development',
  GAME_DEVELOPMENT: 'Game Development',
  BLOCKCHAIN: 'Blockchain',
  DATA_SCIENCE: 'Data Science',
  AI_ML: 'AI & Machine Learning',
  DEVOPS: 'DevOps & Cloud',
  CYBERSECURITY: 'Cybersecurity',
  QA_TESTING: 'QA & Testing',
  UI_UX_DESIGN: 'UI/UX Design',
  GRAPHIC_DESIGN: 'Graphic Design',
  VIDEO_ANIMATION: 'Video & Animation',
  WRITING: 'Writing & Content',
  MARKETING: 'Marketing',
  SALES: 'Sales',
  CUSTOMER_SERVICE: 'Customer Service',
  VIRTUAL_ASSISTANT: 'Virtual Assistant',
  TRANSLATION: 'Translation',
  LEGAL: 'Legal',
  ACCOUNTING: 'Accounting',
  BUSINESS_CONSULTING: 'Business Consulting',
  OTHER: 'Other'
};

export const GIG_CATEGORIES = {
  WEB_DEVELOPMENT: 'Web Development',
  MOBILE_DEVELOPMENT: 'Mobile Development',
  DESKTOP_DEVELOPMENT: 'Desktop Development',
  GAME_DEVELOPMENT: 'Game Development',
  BLOCKCHAIN: 'Blockchain',
  DATA_SCIENCE: 'Data Science',
  AI_ML: 'AI & Machine Learning',
  DEVOPS: 'DevOps & Cloud',
  CYBERSECURITY: 'Cybersecurity',
  QA_TESTING: 'QA & Testing',
  UI_UX_DESIGN: 'UI/UX Design',
  GRAPHIC_DESIGN: 'Graphic Design',
  VIDEO_ANIMATION: 'Video & Animation',
  WRITING: 'Writing & Content',
  MARKETING: 'Marketing',
  SALES: 'Sales',
  CUSTOMER_SERVICE: 'Customer Service',
  VIRTUAL_ASSISTANT: 'Virtual Assistant',
  TRANSLATION: 'Translation',
  LEGAL: 'Legal',
  ACCOUNTING: 'Accounting',
  BUSINESS_CONSULTING: 'Business Consulting',
  OTHER: 'Other'
};

export const COMPLEXITY_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
};

export const TIMELINE_OPTIONS = {
  LESS_THAN_1_WEEK: 'less-than-1-week',
  '1-4_WEEKS': '1-4-weeks',
  '1-3_MONTHS': '1-3-months',
  MORE_THAN_3_MONTHS: 'more-than-3-months'
};

export const DELIVERY_TIME_OPTIONS = {
  LESS_THAN_1_DAY: 1,
  '2-3_DAYS': 3,
  '1_WEEK': 7,
  '2_WEEKS': 14,
  '1_MONTH': 30,
  MORE_THAN_1_MONTH: 31
};

// Category mapping for better search
export const CATEGORY_KEYWORDS = {
  'Web Development': ['web', 'website', 'frontend', 'backend', 'full stack', 'react', 'vue', 'angular', 'node.js', 'php', 'html', 'css', 'javascript'],
  'Mobile Development': ['mobile', 'app', 'ios', 'android', 'react native', 'flutter', 'swift', 'kotlin'],
  'Desktop Development': ['desktop', 'application', 'software', 'windows', 'mac', 'linux', 'c++', 'c#', 'java', 'python'],
  'Game Development': ['game', 'gaming', 'unity', 'unreal', '2d', '3d', 'mobile game', 'pc game'],
  'Blockchain': ['blockchain', 'crypto', 'bitcoin', 'ethereum', 'smart contract', 'solidity', 'web3', 'defi', 'nft'],
  'Data Science': ['data science', 'data analysis', 'machine learning', 'ai', 'python', 'r', 'statistics', 'analytics', 'big data'],
  'AI & Machine Learning': ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'tensorflow', 'pytorch'],
  'DevOps & Cloud': ['devops', 'cloud', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'ci/cd', 'deployment'],
  'Cybersecurity': ['cybersecurity', 'security', 'penetration testing', 'ethical hacking', 'vulnerability', 'firewall'],
  'QA & Testing': ['testing', 'qa', 'quality assurance', 'automation testing', 'manual testing', 'selenium', 'junit'],
  'UI/UX Design': ['ui', 'ux', 'user interface', 'user experience', 'wireframe', 'prototype', 'figma', 'sketch', 'adobe xd'],
  'Graphic Design': ['graphic design', 'logo', 'branding', 'photoshop', 'illustrator', 'indesign', 'canva'],
  'Video & Animation': ['video', 'animation', 'motion graphics', 'after effects', 'premiere', 'final cut', 'blender'],
  'Writing & Content': ['writing', 'content', 'blog', 'article', 'copywriting', 'technical writing', 'creative writing'],
  'Marketing': ['marketing', 'digital marketing', 'seo', 'sem', 'social media', 'email marketing', 'ppc', 'google ads'],
  'Sales': ['sales', 'business development', 'lead generation', 'cold calling', 'sales funnel'],
  'Customer Service': ['customer service', 'support', 'help desk', 'chat support', 'phone support'],
  'Virtual Assistant': ['virtual assistant', 'va', 'administrative', 'data entry', 'scheduling'],
  'Translation': ['translation', 'translator', 'localization', 'language', 'multilingual'],
  'Legal': ['legal', 'lawyer', 'attorney', 'legal advice', 'contract', 'compliance'],
  'Accounting': ['accounting', 'bookkeeping', 'tax', 'financial', 'quickbooks', 'xero'],
  'Business Consulting': ['consulting', 'business', 'strategy', 'management', 'advisory'],
  'Other': ['other', 'miscellaneous']
};

// Helper function to find category from keywords
export const findCategoryFromKeywords = (searchTerm) => {
  const term = searchTerm.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => term.includes(keyword.toLowerCase()))) {
      return category;
    }
  }
  
  return null;
};

// Helper function to get all categories as array
export const getAllJobCategories = () => Object.values(JOB_CATEGORIES);
export const getAllGigCategories = () => Object.values(GIG_CATEGORIES);
