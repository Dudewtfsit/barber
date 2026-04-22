# Barber

## Running Locally

 - Copy `.env.example` to `.env` and set `DATABASE_URL` (Postgres) and `JWT_SECRET`.
 - Install dependencies and start the server:

 ```bash
 cd backend
 npm install
 npm run dev   # starts with nodemon
 ```

 - The backend serves the frontend static files at `http://localhost:3002` by default.
 - To run migrations/seeds:
 ```bash
 npm run migrate
 npm run seed
 ```
# BarberBook - Barber Appointment Booking System

A full-featured web application for booking barber appointments with separate dashboards for clients and barbers.

## Recent Enhancements

### Bug Fixes
- Fixed duplicate form registration event listener that was causing errors
- Removed browser alert dialogs in favor of elegant notification system
- Improved error handling across all API calls with proper try-catch blocks

### New Features & Improvements

#### User Experience
- **Notification System**: Elegant toast-style notifications for success, error, warning, and info messages
- **Loading States**: Visual loading indicators on buttons during API calls
- **Input Validation**: Real-time validation for:
  - Email format
  - Password strength (minimum 6 characters)
  - Name length (minimum 2 characters)
  - Price and duration validation for services
  - Required field validation
- **Better Error Messages**: User-friendly error messages instead of generic alerts
- **Improved Navigation**: Smooth redirects with better UX flow

#### Form Enhancements
- Client-side validation before form submission
- Form submission buttons show loading state with spinner
- Success messages redirect users smoothly after completing actions
- All forms have field validation with visual feedback

#### Technical Improvements
- **Centralized Utilities**: New `AuthUtils` object with:
  - Email validation
  - Password validation
  - Name validation
  - Notification helpers
  - Loading state management
- **Better Error Handling**: Comprehensive try-catch blocks in all async operations
- **CSS Enhancements**: New styles for:
  - Notifications (success, error, warning, info)
  - Loading spinners
  - Form validation feedback
  - Smooth animations

## Features

### For Clients
- **User Registration & Authentication**: Secure signup and login with JWT tokens
- **Browse Barber Shops**: View all available barber shops in the system
- **Book Appointments**: Multi-step booking process with shop selection, service selection, and time slot booking
- **Manage Appointments**: View upcoming appointments and cancel if needed
- **Responsive Design**: Works on desktop and mobile devices
- **Input Validation**: Real-time validation for all forms

### For Barbers
- **Shop Management**: Create and manage barber shop information
- **Service Management**: Add, view, and delete services offered
- **Appointment Management**: View all appointments for their shop, mark appointments as done, or cancel them
- **Dashboard**: Comprehensive dashboard to manage business operations
- **Form Validation**: All inputs validated before submission

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Different permissions for clients and barbers
- **Password Hashing**: bcryptjs for secure password storage
- **Rate Limiting**: Protection against abuse
- **CORS**: Configured for frontend-backend communication
- **Helmet**: Security headers for production

## Technology Stack

### Backend
- **Node.js** with **Express.js**
- **PostgreSQL** database
- **JWT** for authentication
- **bcryptjs** for password hashing
- **express-validator** for input validation
- **express-rate-limit** for rate limiting
- **helmet** for security headers
- **CORS** for cross-origin requests

### Frontend
- **Vanilla JavaScript** (ES6+)
- **HTML5** with semantic markup
- **CSS3** with modern styling
- **Fetch API** for HTTP requests
- **Responsive design** with mobile-first approach
- **LocalStorage API** for token persistence

### Database Schema
- **users**: User accounts with roles (client/barber)
- **barber_shops**: Shop information linked to barber owners
- **services**: Services offered by each shop
- **appointments**: Booking records with status tracking
- **working_hours**: Shop operating hours (future feature)

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd barber-booking-app
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the backend directory:
   ```env
   PORT=3002
   DATABASE_URL=postgresql://username:password@localhost:5432/barber_db
   JWT_SECRET=your-super-secret-jwt-key
   FRONTEND_URL=http://localhost:5500
   ```

4. **Database Setup**
   - Create a PostgreSQL database
   - The application will automatically run migrations on startup
   - Seed data will be inserted automatically

5. **Start the Backend**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

6. **Frontend Setup**
   - Open `frontend/index.html` in a web browser
   - Or serve with a local server (e.g., Live Server extension in VS Code)

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Shop Management (Barbers)
- `POST /api/shop` - Create/update shop
- `GET /api/shop` - Get shop info
- `GET /api/public/shops` - Get all shops (public)

### Services (Barbers)
- `POST /api/services` - Add service
- `GET /api/services` - Get shop services
- `GET /api/services/:shopId` - Get services for a shop
- `DELETE /api/services/:id` - Delete service

### Appointments
- `POST /api/book` - Book appointment (clients)
- `GET /api/appointments` - Get appointments (role-based)
- `PUT /api/appointments/:id/status` - Update status (barbers)
- `PUT /api/appointments/:id/cancel` - Cancel appointment

## Deployment

### Backend (Render)
1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy the backend service

### Frontend (Netlify)
1. Upload the `frontend` folder to Netlify
2. Configure build settings (if needed)
3. Update `FRONTEND_URL` in backend environment

## Usage

### For Clients
1. Register or login to the application
2. Browse available barber shops
3. Select a shop and choose a service
4. Pick an available date and time
5. Confirm your booking
6. View and manage your appointments in the dashboard

### For Barbers
1. Register as a barber
2. Create your shop profile
3. Add services you offer
4. View and manage appointments
5. Mark appointments as completed

## Development

### Project Structure
```
barber-booking-app/
├── backend/
│   ├── app.js                 # Main server file
│   ├── config/
│   │   └── db.js             # Database configuration
│   ├── middleware/
│   │   ├── auth.js           # Authentication middleware
│   │   └── validators.js     # Input validation
│   ├── routes/
│   │   ├── auth.js           # Authentication routes
│   │   ├── shop.js           # Shop management routes
│   │   ├── services.js       # Service management routes
│   │   └── bookings.js       # Appointment routes
│   ├── migrations/
│   │   ├── schema.sql        # Database schema
│   │   └── seed.sql          # Seed data
│   └── package.json
├── frontend/
│   ├── index.html            # Landing page
│   ├── login.html            # Login page
│   ├── register.html         # Registration page
│   ├── booking.html          # Booking page
│   ├── dashboard.html        # Dashboard page
│   ├── barber-dashboard.html # Barber dashboard
│   ├── style.css             # Main stylesheet
│   └── scripts/
│       ├── auth.js           # Authentication logic
│       ├── booking.js        # Booking logic
│       ├── dashboard.js      # Dashboard logic
│       └── index.js          # Homepage logic
└── README.md
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Future Enhancements

- **Working Hours Management**: Allow barbers to set their operating hours
- **Appointment Reminders**: Email/SMS notifications for upcoming appointments
- **Ratings & Reviews**: Client feedback system for barbers
- **Payment Integration**: Online payment processing
- **Calendar View**: Visual calendar for appointment management
- **Mobile App**: Native mobile applications
- **Multi-language Support**: Internationalization
- **Analytics Dashboard**: Business insights for barbers

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact the development team or create an issue in the repository.
   - `DATETIME` → `TIMESTAMP`
   - Remove `IF NOT EXISTS` if needed
   - Adjust any SQLite-specific functions

2. **Update .env**:
   ```
   DATABASE_URL=postgresql://user:password@host:port/dbname  # Will be provided by Railway
   JWT_SECRET=YourSuperSecretKey123!
   PORT=3000
   ```

3. **Create GitHub Repository**:
   - Go to GitHub.com, create new repo
   - Push your code: `git init && git add . && git commit -m "Initial commit" && git remote add origin <your-repo-url> && git push -u origin main`

### Step 2: Deploy Backend to Railway

1. Sign up at [Railway.app](https://railway.app) (free tier available).

2. Click "New Project" > "Deploy from GitHub".

3. Connect your GitHub account and select your barber-app repo.

4. Railway will auto-detect Node.js and deploy.

5. Add PostgreSQL database:
   - In Railway dashboard, click "Add Plugin" > PostgreSQL
   - Copy the DATABASE_URL from the database settings.

6. Set Environment Variables:
   - In Railway project settings, add:
     - `DATABASE_URL`: Paste the PostgreSQL URL
     - `JWT_SECRET`: Your secret key
     - `PORT`: 3000

7. Run Migrations:
   - In Railway, go to your backend service > "Variables" tab, add `NODE_ENV=production`
   - Or connect via Railway CLI: `railway connect` then `railway run npm run migrate`

8. Your backend will be live at `https://your-project.railway.app`

### Step 3: Deploy Frontend to Netlify

1. Sign up at [Netlify.com](https://netlify.com) (free).

2. Click "Add new site" > "Import an existing project" > "Deploy with GitHub".

3. Connect GitHub and select your repo, but deploy only the `frontend` folder:
   - Build command: (leave empty)
   - Publish directory: `frontend`

4. Deploy.

5. Update API URLs in frontend scripts to point to Railway:
   - Change all `https://barber-6bvh.onrender.com` to `https://your-project.railway.app`

6. Push the URL changes to GitHub, Netlify will auto-redeploy.

7. Your frontend will be live at `https://your-site.netlify.app`

### Step 4: Test and Go Live

- Visit your Netlify URL
- Register/login, create shop, book appointments
- Everything should work online!

### Alternative Platforms

- **Render**: Similar to Railway, free tier for Node.js + PostgreSQL
- **Vercel**: Great for frontend, can handle backend with serverless functions
- **Heroku**: Classic option, but free tier removed (paid now)

Need help with any specific step?

## Usage

- Open http://localhost:8081/index.html in browser (local) or your deployed Netlify URL (online).
- Register as barber or client.
- As barber, go to dashboard.html to set up shop and services.
- As client, book appointments on booking.html.

## Notes

- Password hashes in seed.sql are placeholders; real ones generated on register.
- For production, secure secrets, use HTTPS.