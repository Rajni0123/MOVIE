# MovieHub Auto

An automated platform that aggregates movie information, posters, and download links from various sources using web scraping technology with built-in SEO optimization.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: SQLite (default) / PostgreSQL
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with shadcn/ui patterns
- **Scraping**: TMDB API + Universal URL Scraper
- **SEO**: Built-in sitemap, robots.txt, meta tags, JSON-LD schema

## Features

### Admin Panel
- Dashboard with analytics
- Movie management (CRUD operations)
- **Universal URL Scraper** - Import movies from ANY website
- **Bulk Scraper** - Import multiple movies at once
- TMDB Integration for movie metadata
- SEO tools and settings

### Public Frontend
- Movie listing pages with filters
- Individual movie pages with download links
- Search functionality
- Genre, Year, and Trending pages
- SEO optimized with meta tags and schema markup

### Scraping Features
- **Universal Scraper**: Enter any movie website URL, analyze total content, import all or specific number
- **Bulk Import**: Discover and import movies by year/category
- TMDB API integration for high-quality posters, backdrops, and trailers
- Auto-generate SEO metadata (meta description, keywords)

---

## VPS Installation Guide (Ubuntu/Debian)

### Prerequisites

- Ubuntu 20.04+ or Debian 11+
- Root or sudo access
- Minimum 1GB RAM, 20GB storage
- Domain name (optional, for SSL)

### Step 1: Update System & Install Dependencies

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v  # Should show v20.x.x
npm -v   # Should show 10.x.x

# Install Git
sudo apt install -y git

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Nginx (Reverse Proxy)
sudo apt install -y nginx
```

### Step 2: Clone the Repository

```bash
# Navigate to web directory
cd /var/www

# Clone the repository
sudo git clone https://github.com/Rajni0123/MOVIE.git moviehub
sudo chown -R $USER:$USER /var/www/moviehub

# Enter directory
cd moviehub
```

### Step 3: Install Dependencies

```bash
# Install Node.js dependencies
npm install
```

### Step 4: Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add the following content:

```env
# Database (SQLite - default)
DATABASE_URL="file:./dev.db"

# For PostgreSQL (optional):
# DATABASE_URL="postgresql://user:password@localhost:5432/moviehub"

# TMDB API Key (Get free at https://www.themoviedb.org/settings/api)
TMDB_API_KEY="your_tmdb_api_key_here"

# Admin JWT Secret (generate random string)
ADMIN_JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Site Configuration
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"
NEXT_PUBLIC_SITE_NAME="MovieHub"

# Optional: Cloudinary for image uploads
# CLOUDINARY_CLOUD_NAME=""
# CLOUDINARY_API_KEY=""
# CLOUDINARY_API_SECRET=""
```

Save and exit (Ctrl+X, Y, Enter)

### Step 5: Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with admin user
npm run db:seed
```

### Step 6: Build for Production

```bash
# Build the application
npm run build
```

### Step 7: Start with PM2

```bash
# Start the application
pm2 start npm --name "moviehub" -- start

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs
```

### Step 8: Configure Nginx Reverse Proxy

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/moviehub
```

Add the following:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/moviehub /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 9: Setup SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
```

### Step 10: Configure Firewall

```bash
# Allow HTTP, HTTPS, and SSH
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## Default Admin Credentials

After seeding the database:
- **URL**: `https://yourdomain.com/admin`
- **Email**: `admin@moviehub.com`
- **Password**: `admin123`

**IMPORTANT**: Change the password immediately after first login!

---

## Useful PM2 Commands

```bash
# View logs
pm2 logs moviehub

# Monitor
pm2 monit

# Restart
pm2 restart moviehub

# Stop
pm2 stop moviehub

# Delete
pm2 delete moviehub
```

---

## Updating the Application

```bash
cd /var/www/moviehub

# Pull latest changes
git pull origin master

# Install new dependencies
npm install

# Rebuild
npm run build

# Restart PM2
pm2 restart moviehub
```

---

## PostgreSQL Setup (Optional)

If you prefer PostgreSQL over SQLite:

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE USER moviehub WITH PASSWORD 'your_password';
CREATE DATABASE moviehub OWNER moviehub;
GRANT ALL PRIVILEGES ON DATABASE moviehub TO moviehub;
\q
```

Update `.env`:
```env
DATABASE_URL="postgresql://moviehub:your_password@localhost:5432/moviehub"
```

Then run migrations:
```bash
npm run db:push
npm run db:seed
```

---

## Project Structure

```
moviehub/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (admin)/           # Admin panel routes
│   │   │   └── admin/
│   │   │       ├── dashboard/
│   │   │       ├── movies/
│   │   │       ├── scraping/  # Universal & Bulk scrapers
│   │   │       └── seo/
│   │   ├── api/               # API routes
│   │   │   ├── auth/
│   │   │   ├── movies/
│   │   │   └── scraping/
│   │   ├── movie/[slug]/      # Public movie pages
│   │   ├── genres/            # Genre pages
│   │   ├── years/             # Year pages
│   │   └── page.tsx           # Homepage
│   ├── components/
│   │   ├── admin/             # Admin components
│   │   ├── public/            # Public components
│   │   └── ui/                # UI primitives
│   ├── lib/
│   │   ├── auth/              # Authentication
│   │   ├── db/                # Database client
│   │   └── utils/             # Helpers
│   └── types/                 # TypeScript types
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed script
└── public/                    # Static assets
```

---

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server (port 3000)
npm run lint         # Run ESLint

npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with admin user
npm run db:studio    # Open Prisma Studio (database GUI)
```

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout

### Movies
- `GET /api/movies` - List movies
- `POST /api/movies` - Create movie (auth required)
- `GET /api/movies/[id]` - Get single movie
- `PUT /api/movies/[id]` - Update movie (auth required)
- `DELETE /api/movies/[id]` - Delete movie (auth required)

### Scraping
- `POST /api/scraping/url` - Scrape single URL
- `POST /api/scraping/analyze` - Analyze website for total content
- `POST /api/scraping/bulk/discover` - Discover movies from website

---

## Troubleshooting

### Port 3000 Already in Use
```bash
# Find and kill process
sudo lsof -i :3000
sudo kill -9 <PID>
```

### Permission Denied Errors
```bash
sudo chown -R $USER:$USER /var/www/moviehub
```

### Database Connection Failed
```bash
# Check if database file exists (SQLite)
ls -la prisma/dev.db

# Regenerate Prisma client
npm run db:generate
npm run db:push
```

### PM2 Not Starting on Boot
```bash
pm2 startup
# Run the command it outputs, then:
pm2 save
```

---

## License

This project is for educational purposes. Ensure compliance with:
- TMDB API terms of service (attribution required)
- Copyright laws for movie content
- DMCA takedown processes

---

## Support

For issues and feature requests, please create an issue on GitHub.
