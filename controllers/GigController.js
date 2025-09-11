import { existsSync, renameSync, unlinkSync } from "fs";
import prisma from "../prisma/client.js";
import { processGigImages } from "../utils/imageUtils.js";
import { 
  GIG_CATEGORIES, 
  DELIVERY_TIME_OPTIONS, 
  CATEGORY_KEYWORDS, 
  findCategoryFromKeywords 
} from "../utils/categories.js";

export const addGig = async (req, res, next) => {
  try {
    console.log("=== ADD GIG DEBUG START ===");
    console.log("User ID:", req.userId);
    console.log("Files received:", req.files);
    console.log("Query params:", req.query);
    console.log("Body:", req.body);

    let fileNames = [];
    
    // Handle uploaded files if any
    if (req.files && req.files.length > 0) {
      // Handle array of files from upload.array("images")
      req.files.forEach((file) => {
        const date = Date.now();
        const newFileName = date + file.originalname;
        renameSync(file.path, "uploads/" + newFileName);
        fileNames.push(newFileName);
      });
    }

    console.log("File names:", fileNames);

    if (req.query) {
      const {
        title,
        description,
        category,
        features,
        price,
        revisions,
        time,
        shortDesc,
      } = req.query;

      // Process images to ensure there's always at least one (using default if none uploaded)
      const processedImages = processGigImages(fileNames, category);

      console.log("Creating gig with data:", {
        title,
        description,
        deliveryTime: parseInt(time),
        category,
        features,
        price: parseInt(price),
        shortDesc,
        revisions: parseInt(revisions),
        userId: req.userId,
        images: processedImages,
      });

      const gig = await prisma.gig.create({
        data: {
          title,
          description,
          deliveryTime: parseInt(time),
          category,
          features,
          price: parseInt(price),
          shortDesc,
          revisions: parseInt(revisions),
          createdBy: { connect: { id: req.userId } },
          images: processedImages,
        },
      });

      console.log("Gig created successfully:", gig.id);
      console.log("=== ADD GIG DEBUG END ===");
      return res.status(201).json({ message: "Successfully created the gig.", gigId: gig.id });
    }
    
    console.log("Missing query params");
    console.log("=== ADD GIG DEBUG END ===");
    return res.status(400).send("All properties are required.");
  } catch (err) {
    console.error("=== ADD GIG ERROR ===");
    console.error("Error creating gig:", err);
    return res.status(500).send("Internal Server Error.");
  }
};

export const getAllUserGigs = async (req, res, next) => {
  try {
    if (req.userId) {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        include: { gigs: true },
      });
      
      // Process images for each gig to ensure there's always at least one
      const processedGigs = (user?.gigs ?? []).map(gig => ({
        ...gig,
        images: processGigImages(gig.images, gig.category)
      }));
      
      return res.status(200).json({ gigs: processedGigs });
    }
    return res.status(400).send("UserId should be required.");
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error.");
  }
};

export const getGigById = async (req, res, next) => {
  try {
    if (req.params.gigId) {
      const gig = await prisma.gig.findUnique({
        where: { id: req.params.gigId },
        include: {
          createdBy: true,
          reviews: {
            include: { reviewer: true },
          },
        },
      });

      const userWithGigs = await prisma.user.findUnique({
        where: { id: gig.createdBy.id },
        include: { gigs: { include: { reviews: true } } },
      });

      const gigs = userWithGigs?.gigs || [];
      const totalReviews = gigs.reduce(
        (acc, gig) => acc + (gig.reviews?.length || 0),
        0
      );

      const averageRating =
        totalReviews > 0
          ? (
              gigs.reduce(
                (acc, gig) =>
                  acc +
                  gig.reviews.reduce((sum, review) => sum + (review.overallRating || review.rating), 0),
                0
              ) / totalReviews
            ).toFixed(1)
          : "N/A";

      // Process images to ensure there's always at least one
      const processedGig = {
        ...gig,
        images: processGigImages(gig.images, gig.category),
        totalReviews,
        averageRating
      };

      return res
        .status(200)
        .json({ gig: processedGig });
    }
    return res.status(400).send("GigId is required.");
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error.");
  }
};

export const updateGig = async (req, res, next) => {
  try {
    if (req.files) {
      const fileKeys = Object.keys(req.files);
      const fileNames = [];
      fileKeys.forEach((file) => {
        const date = Date.now();
        renameSync(
          req.files[file].path,
          "uploads/" + date + req.files[file].originalname
        );
        fileNames.push(date + req.files[file].originalname);
      });
      if (req.query) {
        const {
          title,
          description,
          category,
          features,
          price,
          revisions,
          time,
          shortDesc,
        } = req.query;

        const oldData = await prisma.gig.findUnique({
          where: { id: req.params.gigId },
        });

        const gig = await prisma.gig.update({
          where: { id: req.params.gigId },
          data: {
            title,
            description,
            deliveryTime: parseInt(time),
            category,
            features,
            price: parseInt(price),
            shortDesc,
            revisions: parseInt(revisions),
            createdBy: { connect: { id: req.userId } },
            images: fileNames,
          },
        });

        oldData?.images?.forEach((image) => {
          if (existsSync(`uploads/${image}`)) {
            unlinkSync(`uploads/${image}`);
          }
        });

        return res.status(200).send("Successfuly updated the gig.");
      }
    }
    return res.status(400).send("All properties are required.");
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error.");
  }
};

export const getAllGigs = async (req, res, next) => {
  try {
    let whereCondition = {};
    
    // Only exclude user's own gigs if they are logged in
    if (req.userId) {
      whereCondition.createdBy = {
        id: {
          not: req.userId
        }
      };
    }

    const gigs = await prisma.gig.findMany({
      where: whereCondition,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        createdBy: true,
        reviews: {
          include: {
            reviewer: true,
          },
        },
      },
    });

    // Process images for each gig to ensure there's always at least one
    const processedGigs = gigs.map(gig => ({
      ...gig,
      images: processGigImages(gig.images, gig.category)
    }));

    return res.status(200).json({ gigs: processedGigs });
  } catch (error) {
    console.error("Error in getAllGigs:", error);
    return res.status(500).send("Internal Server Error");
  }
};

export const searchGigs = async (req, res, next) => {
  try {
    const { searchTerm, category, deliveryTime, minPrice, maxPrice } = req.query;
    
    if (!searchTerm && !category && !deliveryTime && !minPrice && !maxPrice) {
      return res.status(400).send("At least one search parameter is required.");
    }

    const searchTermLower = searchTerm ? searchTerm.toLowerCase() : '';
    const gigs = await prisma.gig.findMany(
      createSearchQuery(searchTermLower, category, deliveryTime, minPrice, maxPrice, req.userId)
    );

    // Process images for each gig to ensure there's always at least one
    const processedGigs = gigs.map(gig => ({
      ...gig,
      images: processGigImages(gig.images, gig.category)
    }));

    return res.status(200).json({ gigs: processedGigs });
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error.");
  }
};

const createSearchQuery = (searchTerm, category, deliveryTime, minPrice, maxPrice, excludeUserId = null) => {
  const query = {
    where: {
      AND: [],
      OR: [],
    },
    include: {
      createdBy: true,
      reviews: {
        include: {
          reviewer: true,
        },
      },
    },
  };

  // Exclude user's own gigs if excludeUserId is provided
  if (excludeUserId) {
    query.where.AND.push({
      createdBy: {
        id: {
          not: excludeUserId
        }
      }
    });
  }

  // Add search term filters
  if (searchTerm) {
    query.where.OR.push({
      title: { contains: searchTerm, mode: "insensitive" },
    });
    query.where.OR.push({
      description: { contains: searchTerm, mode: "insensitive" },
    });
  }

  // Add category filter with improved logic
  if (category && category !== 'all') {
    const categoryLower = category.toLowerCase();
    const categoryKeywords = CATEGORY_KEYWORDS[category] || [category];
    
    // Search for exact category match
    query.where.OR.push({
      category: { contains: categoryLower, mode: "insensitive" },
    });
    
    // Search for category keywords in title, description, and features
    categoryKeywords.forEach(keyword => {
      query.where.OR.push(
        { title: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
        { features: { hasSome: [keyword] } }
      );
    });
  }

  // Add delivery time filter with improved logic
  if (deliveryTime && deliveryTime !== 'all') {
    const days = Number(deliveryTime);
    
    if (days === 1) {
      // Less than 1 day
      query.where.AND.push({
        deliveryTime: { lte: 1 }
      });
    } else if (days <= 7) {
      // Up to 1 week
      query.where.AND.push({
        deliveryTime: { lte: 7 }
      });
    } else if (days <= 14) {
      // Up to 2 weeks
      query.where.AND.push({
        deliveryTime: { lte: 14 }
      });
    } else if (days <= 30) {
      // Up to 1 month
      query.where.AND.push({
        deliveryTime: { lte: 30 }
      });
    } else {
      // More than 1 month
      query.where.AND.push({
        deliveryTime: { gt: 30 }
      });
    }
  }

  // Add price filters
  if (minPrice) {
    query.where.AND.push({
      price: { gte: Number(minPrice) }
    });
  }
  if (maxPrice) {
    query.where.AND.push({
      price: { lte: Number(maxPrice) }
    });
  }

  // If no OR conditions, remove the OR array
  if (query.where.OR.length === 0) {
    delete query.where.OR;
  }

  return query;
};

const checkOrder = async (userId, gigId) => {
  try {
    const hasUserOrderedGig = await prisma.order.findFirst({
      where: {
        buyerId: userId,
        gigId: gigId,
        isCompleted: true,
      },
    });
    return hasUserOrderedGig;
  } catch (err) {
    console.log(err);
  }
};

export const checkGigOrder = async (req, res, next) => {
  try {
    if (req.userId && req.params.gigId) {
      const hasUserOrderedGig = await checkOrder(req.userId, req.params.gigId);
      return res
        .status(200)
        .json({ hasUserOrderedGig: hasUserOrderedGig ? true : false });
    }
    return res.status(400).send("userId and gigId is required.");
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
};

export const addReview = async (req, res, next) => {
  try {
    if (req.userId && req.params.gigId) {
      if (await checkOrder(req.userId, req.params.gigId)) {
        if (req.body.reviewText && (req.body.rating || req.body.overallRating)) {
          const rating = req.body.rating ? parseInt(req.body.rating) : undefined;
          const skillSpecificRating = req.body.skillSpecificRating ? parseInt(req.body.skillSpecificRating) : undefined;
          const communicationRating = req.body.communicationRating ? parseInt(req.body.communicationRating) : undefined;
          const timelinessRating = req.body.timelinessRating ? parseInt(req.body.timelinessRating) : undefined;
          const qualityRating = req.body.qualityRating ? parseInt(req.body.qualityRating) : undefined;
          const overall = req.body.overallRating
            ? parseInt(req.body.overallRating)
            : Math.round(
                [skillSpecificRating, communicationRating, timelinessRating, qualityRating]
                  .filter((v) => typeof v === "number")
                  .reduce((a, b, _, arr) => a + b) / Math.max(1, [skillSpecificRating, communicationRating, timelinessRating, qualityRating].filter((v) => typeof v === "number").length)
              );

          const newReview = await prisma.reviews.create({
            data: {
              rating: rating ?? overall,
              overallRating: overall,
              skillSpecificRating,
              communicationRating,
              timelinessRating,
              qualityRating,
              skillCategory: req.body.skillCategory,
              verifiedPurchase: true,
              comment: req.body.reviewText,
              reviewer: { connect: { id: req.userId } },
              gig: { connect: { id: req.params.gigId } },
            },
            include: {
              reviewer: true,
            },
          });

          return res.status(201).json({ newReview });
        }

        return res.status(400).send("ReviewText and Rating is required.");
      }
      return res.status(400).send("You have not ordered this gig.");
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
};
