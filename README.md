# TalentHive Backend

A robust Node.js backend API for TalentHive - a freelance marketplace platform built with Express.js, Prisma, and PostgreSQL.

## 🚀 Features

- **User Authentication**: JWT-based authentication with bcrypt password hashing
- **Database Management**: Prisma ORM with PostgreSQL
- **File Upload**: Multer-based file upload system
- **Payment Processing**: Stripe integration for secure payments
- **Real-time Messaging**: Built-in messaging system
- **Order Management**: Complete order lifecycle management
- **Gig Management**: CRUD operations for freelance gigs
- **Job Management**: Job posting and application system
- **Dispute Resolution**: Built-in dispute handling system
- **CORS Support**: Configurable CORS for frontend integration

## 🛠️ Tech Stack

- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt
- **File Upload**: Multer
- **Payment**: Stripe
- **Environment**: dotenv
- **Development**: nodemon

## 📋 Prerequisites

Before running this application, make sure you have:

- Node.js (v16 or higher)
- PostgreSQL database
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

3. **Database Setup**
   
   Make sure you have PostgreSQL running and create a database for the application.

4. **Environment Configuration**
   
   Create a `.env` file in the root directory with the following variables:
   
   ```env
   # Database Configuration
   DATABASE_URL="postgresql://username:password@localhost:5432/talenthive_db"
   
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
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: Secret key for JWT token signing
   - `STRIPE_SECRET_KEY`: Your Stripe secret key for payment processing
   - `PUBLIC_URL`: Frontend URL for CORS configuration
   - `PORT`: Server port (optional, defaults to 4003)
   - `NODE_ENV`: Environment mode (development/production)

5. **Database Migration**
   ```bash
   npm run db:push
   ```

6. **Seed Database (Optional)**
   ```bash
   npm run db:seed
   ```

7. **Start the server**
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

## 🆘 Support

If you encounter any issues:

1. Check the [Frontend Repository](https://github.com/mortiestmorty1/talent-hive-frontend.git) for frontend-related issues
2. Create an issue in this repository
3. Contact the development team

## 🔗 Related Repositories

- [TalentHive Frontend](https://github.com/mortiestmorty1/talent-hive-frontend.git) - The frontend React application

## 📝 Important Notes

- **Database**: Make sure PostgreSQL is running and accessible
- **Environment Variables**: Never commit your `.env` file to version control
- **Stripe Keys**: Use test keys for development, live keys for production
- **File Uploads**: The `uploads/` directory is excluded from git
- **CORS**: Configure `PUBLIC_URL` to match your frontend domain

---

**Security Warning**: Keep your environment variables secure and never expose them in client-side code or public repositories.
