import { 
  JOB_CATEGORIES, 
  GIG_CATEGORIES, 
  COMPLEXITY_LEVELS, 
  TIMELINE_OPTIONS, 
  DELIVERY_TIME_OPTIONS,
  getAllJobCategories,
  getAllGigCategories
} from "../utils/categories.js";

export const getJobCategories = async (req, res) => {
  try {
    const categories = getAllJobCategories();
    const complexityLevels = Object.values(COMPLEXITY_LEVELS);
    const timelineOptions = Object.values(TIMELINE_OPTIONS);
    
    return res.status(200).json({
      categories,
      complexityLevels,
      timelineOptions,
      meta: {
        totalCategories: categories.length,
        totalComplexityLevels: complexityLevels.length,
        totalTimelineOptions: timelineOptions.length
      }
    });
  } catch (error) {
    console.error("Error in getJobCategories:", error);
    return res.status(500).send("Internal Server Error");
  }
};

export const getGigCategories = async (req, res) => {
  try {
    const categories = getAllGigCategories();
    const deliveryTimeOptions = Object.entries(DELIVERY_TIME_OPTIONS).map(([key, value]) => ({
      label: key.replace(/_/g, ' '),
      value: value
    }));
    
    return res.status(200).json({
      categories,
      deliveryTimeOptions,
      meta: {
        totalCategories: categories.length,
        totalDeliveryTimeOptions: deliveryTimeOptions.length
      }
    });
  } catch (error) {
    console.error("Error in getGigCategories:", error);
    return res.status(500).send("Internal Server Error");
  }
};

export const getAllCategories = async (req, res) => {
  try {
    const jobCategories = getAllJobCategories();
    const gigCategories = getAllGigCategories();
    const complexityLevels = Object.values(COMPLEXITY_LEVELS);
    const timelineOptions = Object.values(TIMELINE_OPTIONS);
    const deliveryTimeOptions = Object.entries(DELIVERY_TIME_OPTIONS).map(([key, value]) => ({
      label: key.replace(/_/g, ' '),
      value: value
    }));
    
    return res.status(200).json({
      jobs: {
        categories: jobCategories,
        complexityLevels,
        timelineOptions
      },
      gigs: {
        categories: gigCategories,
        deliveryTimeOptions
      },
      meta: {
        totalJobCategories: jobCategories.length,
        totalGigCategories: gigCategories.length,
        totalComplexityLevels: complexityLevels.length,
        totalTimelineOptions: timelineOptions.length,
        totalDeliveryTimeOptions: deliveryTimeOptions.length
      }
    });
  } catch (error) {
    console.error("Error in getAllCategories:", error);
    return res.status(500).send("Internal Server Error");
  }
};
