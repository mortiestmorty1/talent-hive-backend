import prisma from "../prisma/client.js";

// Get dashboard data for sellers
export const getSellerData = async (req, res, next) => {
  try {
    if (req.userId) {
      const gigs = await prisma.gig.count({ where: { userId: req.userId } });
      const {
        _count: { id: orders },
      } = await prisma.order.aggregate({
        where: {
          OR: [
            { isCompleted: true },
            { status: 'COMPLETED' }
          ],
          gig: {
            createdBy: {
              id: req.userId,
            },
          },
        },
        _count: {
          id: true,
        },
      });
      const unreadMessages = await prisma.messages.count({
        where: {
          receiverId: req.userId,
          isRead: false,
        },
      });

      const today = new Date();
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const thisYear = new Date(today.getFullYear(), 0, 1);

      const {
        _sum: { price: revenue },
      } = await prisma.order.aggregate({
        where: {
          gig: {
            createdBy: {
              id: req.userId,
            },
          },
          OR: [
            { isCompleted: true },
            { status: 'COMPLETED' }
          ],
          createdAt: {
            gte: thisYear,
          },
        },
        _sum: {
          price: true,
        },
      });

      const {
        _sum: { price: dailyRevenue },
      } = await prisma.order.aggregate({
        where: {
          gig: {
            createdBy: {
              id: req.userId,
            },
          },
          OR: [
            { isCompleted: true },
            { status: 'COMPLETED' }
          ],
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        _sum: {
          price: true,
        },
      });

      const {
        _sum: { price: monthlyRevenue },
      } = await prisma.order.aggregate({
        where: {
          gig: {
            createdBy: {
              id: req.userId,
            },
          },
          OR: [
            { isCompleted: true },
            { status: 'COMPLETED' }
          ],
          createdAt: {
            gte: thisMonth,
          },
        },
        _sum: {
          price: true,
        },
      });
      return res.status(200).json({
        dashboardData: {
          orders,
          gigs,
          unreadMessages,
          dailyRevenue,
          monthlyRevenue,
          revenue,
        },
      });
    }
    return res.status(400).send("User id is required.");
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
};

// Get dashboard data for buyers
export const getBuyerData = async (req, res, next) => {
  try {
    if (req.userId) {
      const jobs = await prisma.jobPosting.count({ where: { clientId: req.userId } });

      // Count active orders (both in progress and pending completion)
      const activeOrders = await prisma.order.count({
        where: {
          buyerId: req.userId,
          status: {
            in: ['IN_PROGRESS', 'PENDING_COMPLETION']
          }
        },
      });

      // Count completed orders
      const completedProjects = await prisma.order.count({
        where: {
          buyerId: req.userId,
          OR: [
            { isCompleted: true },
            { status: 'COMPLETED' }
          ]
        },
      });

      // Count total applications for user's jobs
      const jobApplications = await prisma.application.count({
        where: {
          job: {
            clientId: req.userId
          }
        },
      });

      const unreadMessages = await prisma.messages.count({
        where: {
          receiverId: req.userId,
          isRead: false,
        },
      });

      // Calculate average rating from reviews received
      const reviews = await prisma.reviews.findMany({
        where: {
          job: {
            clientId: req.userId
          }
        },
        select: {
          rating: true,
          overallRating: true
        }
      });

      let averageRating = 0;
      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum, review) =>
          sum + (review.overallRating || review.rating), 0
        );
        averageRating = totalRating / reviews.length;
      }

      return res.status(200).json({
        dashboardData: {
          jobs,
          activeOrders,
          completedProjects,
          jobApplications,
          unreadMessages,
          averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        },
      });
    }
    return res.status(400).send("User id is required.");
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
};

// Get general dashboard data (works for both buyers and sellers)
export const getDashboardData = async (req, res, next) => {
  try {
    if (req.userId) {
      // Check if user is a seller (has gigs) or buyer
      const userGigs = await prisma.gig.count({ where: { userId: req.userId } });
      const userJobs = await prisma.jobPosting.count({ where: { clientId: req.userId } });

      if (userGigs > 0) {
        // User is a seller
        return getSellerData(req, res, next);
      } else {
        // User is a buyer
        return getBuyerData(req, res, next);
      }
    }
    return res.status(400).send("User id is required.");
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
};
