# TalentHive Backend

A robust Node.js backend API for TalentHive - a freelance marketplace platform built with Express.js, Prisma, and PostgreSQL.

## 🚀 Features

- **User Authentication**: JWT-based authentication with bcrypt password hashing
- **Database Management**: Prisma ORM with MongoDB
- **File Upload**: Multer-based file upload system
- **Payment Processing**: Stripe integration for secure payments
- **Real-time Communication**: Socket.io for instant messaging and updates
- **Order Management**: Complete order lifecycle with status tracking
- **Review System**: Verified purchase reviews with multi-criteria ratings
- **Gig Management**: CRUD operations for freelance gigs
- **Job Management**: Job posting and application system with milestones
- **Dispute Resolution**: Built-in dispute handling system with mediation
- **CORS Support**: Configurable CORS for frontend integration
- **Role-Based Access Control**: Separate permissions for buyers and sellers

## 🛠️ Tech Stack

- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js
- **Database**: MongoDB with Prisma ORM
- **Real-time**: Socket.io
- **Authentication**: JWT with bcrypt
- **File Upload**: Multer
- **Payment**: Stripe
- **Environment**: dotenv
- **Development**: nodemon

## 📋 Prerequisites

Before running this application, make sure you have:

- Node.js (v16 or higher)
- MongoDB database
- npm or yarn
- Stripe account for payment processing

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mortiestmorty1/talent-hive-backend.git
   cd talent-hive-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Generate Prisma Client**
   
   After installing dependencies, you must generate the Prisma client:
   ```bash
   npx prisma generate
   ```
   
   **Important:** This step is required on every new machine/clone. The Prisma client must be generated before running the server.

4. **Database Setup**
   
   Make sure you have MongoDB running and accessible.

5. **Environment Configuration**
   
   Create a `.env` file in the root directory with the following variables:
   
   ```env
   # Database Configuration
   DATABASE_URL="mongodb://localhost:27017/talenthive_db"
   # Or for MongoDB Atlas:
   # DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/talenthive_db"
   
   # JWT Configuration
   JWT_SECRET="your_super_secret_jwt_key_here"
   
   # Stripe Configuration
   STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here"
   
   # Server Configuration
   PORT=4003
   PUBLIC_URL="http://localhost:3000"
   
   # Environment
   NODE_ENV="development"
   ```
   
   **Required Environment Variables:**
   - `DATABASE_URL`: MongoDB connection string
   - `JWT_SECRET`: Secret key for JWT token signing
   - `STRIPE_SECRET_KEY`: Your Stripe secret key for payment processing
   - `PUBLIC_URL`: Frontend URL for CORS configuration
   - `PORT`: Server port (optional, defaults to 4003)
   - `NODE_ENV`: Environment mode (development/production)
   
   **Important:** Always start the backend with:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 4003 --reload
   ```
   Or use `npm run dev` if configured properly.

6. **Database Migration**
   ```bash
   npm run db:push
   ```
   
   This will sync your Prisma schema with your MongoDB database.

7. **Seed Database (Optional)**
   ```bash
   npm run db:seed
   ```

8. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

8. **Verify the server**
   
   The server will be running on `http://localhost:4003` (or your configured PORT).

## 🏗️ Project Structure

```
server/
├── controllers/        # Route controllers
│   ├── AuthControllers.js
│   ├── UserController.js
│   ├── GigController.js
│   ├── JobController.js
│   ├── OrderController.js
│   ├── MessagesController.js
│   ├── DisputeController.js
│   └── DashboardController.js
├── middlewares/        # Custom middleware
│   └── AuthMiddleware.js
├── routes/            # API routes
│   ├── AuthRoutes.js
│   ├── UserRoutes.js
│   ├── GigRoutes.js
│   ├── JobRoutes.js
│   ├── OrderRoutes.js
│   ├── MessagesRoutes.js
│   ├── DisputeRoutes.js
│   └── DashboardRoutes.js
├── services/          # Business logic services
│   └── MatchingService.js
├── prisma/           # Database schema and client
│   ├── schema.prisma
│   ├── client.js
│   └── seed.js
├── uploads/          # File upload directory
└── index.js          # Main server file
```

## 🚀 Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run db:push` - Push database schema changes
- `npm run db:seed` - Seed database with initial data
- `npm run db:add-reviews` - Add sample reviews with skill ratings
- `postinstall` - Automatically runs `prisma generate` after `npm install`

## 🗄️ Database Schema

The application uses Prisma ORM with the following main entities:

- **User**: User accounts and profiles
- **Gig**: Freelance service offerings
- **Job**: Job postings and applications
- **Order**: Order management and payments
- **Message**: Real-time messaging system
- **Dispute**: Dispute resolution system

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/:id` - Get user by ID

### Gigs
- `GET /api/gigs` - Get all gigs
- `POST /api/gigs` - Create new gig
- `GET /api/gigs/:id` - Get gig by ID
- `PUT /api/gigs/:id` - Update gig
- `DELETE /api/gigs/:id` - Delete gig

### Jobs
- `GET /api/jobs` - Get all jobs
- `POST /api/jobs` - Create new job
- `GET /api/jobs/:id` - Get job by ID
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id` - Update order status

### Messages
- `GET /api/messages/:orderId` - Get messages for order
- `POST /api/messages` - Send message

## 💳 Payment Integration

The application integrates with Stripe for payment processing:

1. **Setup Stripe Account**
   - Create account at [stripe.com](https://stripe.com)
   - Get your secret key from the dashboard
   - Add it to your `.env` file

2. **Payment Flow**
   - Orders are created with pending status
   - Stripe payment intents are created
   - Payments are processed securely
   - Order status is updated based on payment result

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **CORS Protection**: Configurable CORS for frontend integration
- **Input Validation**: Request validation and sanitization
- **File Upload Security**: Secure file upload with validation

## 📁 File Upload

The application supports file uploads for:

- User profile pictures
- Gig images and portfolios
- Project deliverables
- Dispute evidence

Files are stored in the `uploads/` directory and organized by type.

## 🔗 Frontend Integration

This backend is designed to work with the TalentHive frontend:

1. **CORS Configuration**: Set `PUBLIC_URL` to your frontend URL
2. **API Endpoints**: All endpoints are prefixed with `/api`
3. **Authentication**: JWT tokens are used for authentication
4. **File Uploads**: Supports multipart/form-data for file uploads

## 🚀 Deployment

### Environment Variables for Production

```env
DATABASE_URL="postgresql://username:password@your-db-host:5432/talenthive_db"
JWT_SECRET="your_production_jwt_secret"
STRIPE_SECRET_KEY="sk_live_your_live_stripe_key"
PORT=4003
PUBLIC_URL="https://your-frontend-domain.com"
NODE_ENV="production"
```

### Deployment Platforms

- **Heroku**: Easy deployment with PostgreSQL addon
- **DigitalOcean**: App Platform or Droplet
- **AWS**: EC2 with RDS for database
- **Railway**: Simple deployment with built-in PostgreSQL
- **Render**: Free tier available with PostgreSQL

## 🧪 Testing

To test the API endpoints:

1. Use tools like Postman or Insomnia
2. Start with authentication endpoints
3. Use the returned JWT token for protected routes
4. Test file uploads with multipart/form-data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Errors and Solutions

#### Error: `@prisma/client did not initialize yet`

**Problem:** This error occurs when you try to run the server without generating the Prisma client first.

**Solution:**
```bash
# Step 1: Make sure you're in the server directory
cd server

# Step 2: Generate the Prisma client
npx prisma generate

# Step 3: Now you can run the server
npm run dev
```

**Note:** With the updated `package.json`, running `npm install` will automatically run `prisma generate` via the `postinstall` script. However, if you encounter this error, manually run `npx prisma generate`.

#### Error: `Cannot find module` or `Module not found`

**Solution:**
```bash
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install

# Generate Prisma client
npx prisma generate
```

#### Error: Database connection failed

**Solution:**
1. Verify MongoDB is running:
   ```bash
   # Check if MongoDB is running (varies by OS)
   # Windows: Check Services
   # Mac/Linux: sudo systemctl status mongod
   ```

2. Check your `.env` file has the correct `DATABASE_URL`:
   ```env
   DATABASE_URL="mongodb://localhost:27017/talenthive_db"
   ```

3. Test the connection:
   ```bash
   npx prisma db push
   ```

#### Error: Port already in use

**Solution:**
1. Change the `PORT` in your `.env` file
2. Or kill the process using the port:
   ```bash
   # Windows PowerShell
   netstat -ano | findstr :4003
   taskkill /PID <PID> /F
   
   # Mac/Linux
   lsof -ti:4003 | xargs kill
   ```

## 🆘 Support

If you encounter any issues:

1. Check the [Frontend Repository](https://github.com/mortiestmorty1/talent-hive-frontend.git) for frontend-related issues
2. Create an issue in this repository
3. Contact the development team

## 🔗 Related Repositories

- [TalentHive Frontend](https://github.com/mortiestmorty1/talent-hive-frontend.git) - The frontend React application

## 📝 Recent Updates

### Latest Features (v1.0.1)

1. **Enhanced Review System** ⭐
   - Fixed `checkOrder()` function to accept both `isCompleted` and `status: 'COMPLETED'`
   - Reviews now work correctly after order completion
   - Automatic verified purchase marking
   - Multi-criteria ratings (skill, communication, timeliness, quality)
   - **Skill-based ratings**: Rate individual skills from completed work
   - **Rating-based matching**: Freelancers matched based on skill ratings from reviews

2. **Real-time Notifications** 🔔
   - Socket.io integration for instant messaging
   - Real-time order status updates
   - Milestone progress notifications
   - Dispute activity updates

3. **Order Status Management** 📊
   - Synchronizes `status` and `isCompleted` fields
   - Proper workflow: IN_PROGRESS → PENDING_COMPLETION → COMPLETED
   - Buyer approval workflow for order completion
   - Status tracking for both gigs and jobs

4. **Rating-Based Matching System** 🎯
   - Matches freelancers to jobs based on skill ratings from completed work
   - Considers both gig reviews and job reviews
   - Calculates average skill ratings per freelancer
   - Weights by number of reviews for reliability

### Technical Improvements

**Review Validation:**
```javascript
// Now accepts EITHER condition
where: {
  buyerId: userId,
  gigId: gigId,
  OR: [
    { isCompleted: true },
    { status: 'COMPLETED' }
  ]
}
```

**Order Status Sync:**
When order is marked as COMPLETED, both fields are updated:
- `status: 'COMPLETED'`
- `isCompleted: true`

This ensures backward compatibility and proper review access.

**Rating-Based Matching:**
The matching service now:
- Fetches reviews for freelancers' completed gigs (where `gig.userId === freelancer.id`)
- Fetches reviews for freelancers' completed jobs (where `job.acceptedFreelancerId === freelancer.id`)
- Calculates skill ratings from all reviews
- Matches based on proven performance, not just keywords

## 🎯 Skill Rating System

### Adding Reviews with Skill Ratings

**Quick Command:**
```bash
cd server
npm run db:add-reviews
```

This will:
- Find completed orders and jobs
- Add reviews with skill-specific ratings
- Help test the rating-based matching system

**How to Rate Skills:**

1. **Complete a Project**: Wait for order/job to be marked as "COMPLETED"
2. **Navigate to Review Form**: 
   - For Gigs: Go to `/gig/[gigId]` and scroll to "Leave a Review"
   - For Jobs: Go to `/jobs/[jobId]` and find the review section
3. **Rate Skills**: 
   - Rate each required skill from 1-5 stars
   - Rate communication, timeliness, and quality
   - Add comments about the experience
4. **Submit**: Your ratings are saved and used for matching!

**Example:**
- Job Required: React, Node.js, MongoDB
- Your Ratings: React ⭐⭐⭐⭐⭐, Node.js ⭐⭐⭐⭐, MongoDB ⭐⭐⭐⭐⭐
- These ratings are used to match freelancers to future jobs requiring these skills

### Database Scripts

- `npm run db:seed` - Seed database with initial data
- `npm run db:add-reviews` - Add sample reviews with skill ratings
- `npm run db:push` - Push schema changes to database

## 📝 Important Notes

- **Database**: Make sure MongoDB is running and accessible
- **Environment Variables**: Never commit your `.env` file to version control
- **Stripe Keys**: Use test keys for development, live keys for production
- **File Uploads**: The `uploads/` directory is excluded from git
- **CORS**: Configure `PUBLIC_URL` to match your frontend domain
- **Server Start**: Use `uvicorn main:app --host 0.0.0.0 --port 4003 --reload` or configured npm scripts

---

**Security Warning**: Keep your environment variables secure and never expose them in client-side code or public repositories.
