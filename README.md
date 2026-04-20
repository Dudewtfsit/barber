# Barber Booking App

This is a production-ready Node.js/Express booking app for a single barber shop.

## Local Development Setup

1. Install Node.js (v18+) and ensure PowerShell execution policy allows scripts (`Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`).

2. The app now uses SQLite for simplicity. No PostgreSQL needed.

3. Update `backend/.env` if needed (default PORT=3000).

4. Install backend dependencies:
   ```
   cd backend
   npm install
   ```

5. Run migrations to create database and seed data:
   ```
   npm run migrate
   ```

6. Start the backend:
   ```
   npm run dev
   ```
   Server runs on http://localhost:3001

7. Install http-server globally:
   ```
   npm install -g http-server
   ```

8. Start the frontend server:
   ```
   cd frontend
   http-server -p 8081
   ```
   Frontend available at http://localhost:8081

## Online Deployment (Recommended for Production)

Running locally is fine for development, but for a live app accessible online, deploy to cloud platforms. Here's a complete step-by-step guide:

### Step 1: Prepare Code for Production

2. **Update SQL for PostgreSQL**: The migration files (`backend/migrations/schema.sql` and `seed.sql`) use SQLite syntax. Convert to PostgreSQL:
   - `AUTOINCREMENT` → `SERIAL`
   - `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
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