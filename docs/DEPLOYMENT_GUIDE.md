# Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Production Build](#production-build)
4. [Docker Deployment](#docker-deployment)
5. [Cloud Deployment](#cloud-deployment)
6. [Environment Variables](#environment-variables)
7. [Security Considerations](#security-considerations)

---

## Prerequisites

### Required Software
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Docker** (optional): v24.x or higher
- **Docker Compose** (optional): v2.x or higher

### Required Services
- **Google Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

---

## Local Development

### 1. Clone Repository
```bash
git clone <repository-url>
cd QueryForge
```

### 2. Install Dependencies

**Backend:**
```bash
cd server
npm install
```

**Frontend:**
```bash
cd client
npm install
```

### 3. Configure Environment

Create `server/.env`:
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Google Gemini AI (supports multiple keys for rotation)
GEMINI_API_KEY=your_primary_key_here
GEMINI_API_KEY_1=backup_key_1
GEMINI_API_KEY_2=backup_key_2
GEMINI_API_KEY_3=backup_key_3
GEMINI_API_KEY_4=backup_key_4

# Database
DATABASE_PATH=./data/history.db

# Logging
LOG_LEVEL=debug

# CORS
ALLOWED_ORIGINS=http://localhost:5173
```

### 4. Start Development Servers

**Backend:**
```bash
cd server
npm run dev
```

**Frontend:**
```bash
cd client
npm run dev
```

Access the application at: http://localhost:5173

---

## Production Build

### 1. Build Frontend
```bash
cd client
npm run build
```
Builds production files to `client/dist/`

### 2. Build Backend
```bash
cd server
npm run build
```
Compiles TypeScript to `server/dist/`

### 3. Configure Production Environment

Create `server/.env.production`:
```env
PORT=3001
NODE_ENV=production
GEMINI_API_KEY=your_production_key
DATABASE_PATH=/app/data/history.db
LOG_LEVEL=info
ALLOWED_ORIGINS=https://your-domain.com
```

### 4. Run Production Server
```bash
cd server
npm start
```

### 5. Serve Frontend
Use a web server like Nginx or serve the `client/dist` folder:

**Using serve:**
```bash
npm install -g serve
cd client/dist
serve -s . -p 80
```

**Using Nginx:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## Docker Deployment

### Using Docker Compose (Recommended)

**1. Build and Run:**
```bash
docker-compose up -d
```

**2. View Logs:**
```bash
docker-compose logs -f
```

**3. Stop Services:**
```bash
docker-compose down
```

### Individual Container Build

**Backend:**
```bash
cd server
docker build -t queryforge-backend .
docker run -p 3001:3001 --env-file .env queryforge-backend
```

**Frontend:**
```bash
cd client
docker build -t queryforge-frontend .
docker run -p 80:80 queryforge-frontend
```

---

## Cloud Deployment

### Vercel (Frontend Only)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
cd client
vercel --prod
```

3. Configure environment variables in Vercel dashboard

### AWS EC2

**1. Launch EC2 Instance:**
- Choose Ubuntu 22.04 LTS
- Select instance type (t3.medium recommended)
- Configure security group (ports 80, 443, 3001)

**2. Connect and Setup:**
```bash
ssh ubuntu@your-ec2-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Clone and deploy
git clone <repository-url>
cd QueryForge
docker-compose up -d
```

**3. Setup Nginx:**
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/queryforge
# Add nginx configuration
sudo ln -s /etc/nginx/sites-available/queryforge /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

### Azure App Service

**1. Create Resources:**
```bash
az group create --name queryforge-rg --location eastus
az appservice plan create --name queryforge-plan --resource-group queryforge-rg --sku B1 --is-linux
```

**2. Deploy Backend:**
```bash
cd server
az webapp create --resource-group queryforge-rg --plan queryforge-plan --name queryforge-backend --runtime "NODE|20-lts"
az webapp deployment source config-local-git --name queryforge-backend --resource-group queryforge-rg
git push azure master
```

**3. Deploy Frontend:**
```bash
cd client
npm run build
az storage account create --name queryforge --resource-group queryforge-rg
az storage blob service-properties update --account-name queryforge --static-website --index-document index.html
az storage blob upload-batch --source ./dist --destination '$web' --account-name queryforge
```

### Google Cloud Platform

**1. Build and Push Images:**
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/queryforge-backend server/
gcloud builds submit --tag gcr.io/PROJECT_ID/queryforge-frontend client/
```

**2. Deploy to Cloud Run:**
```bash
gcloud run deploy queryforge-backend \
  --image gcr.io/PROJECT_ID/queryforge-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

gcloud run deploy queryforge-frontend \
  --image gcr.io/PROJECT_ID/queryforge-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## Environment Variables

### Backend (.env)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 3001 | No |
| `NODE_ENV` | Environment | development | Yes |
| `GEMINI_API_KEY` | Primary Gemini API key | - | Yes |
| `GEMINI_API_KEY_1` | Backup API key | - | No |
| `GEMINI_API_KEY_2` | Backup API key | - | No |
| `DATABASE_PATH` | SQLite database path | ./data/history.db | No |
| `LOG_LEVEL` | Logging level | info | No |
| `ALLOWED_ORIGINS` | CORS origins | http://localhost:5173 | No |
| `MAX_REQUEST_SIZE` | Max request body size | 10mb | No |
| `RATE_LIMIT_WINDOW` | Rate limit window (ms) | 900000 | No |
| `RATE_LIMIT_MAX` | Max requests per window | 100 | No |

### Frontend (Build Time)

Configure in `client/vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

---

## Security Considerations

### 1. API Keys
- Never commit API keys to version control
- Use environment variables
- Rotate keys regularly
- Implement key rotation mechanism

### 2. CORS Configuration
```typescript
// server/src/app.ts
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:5173',
  credentials: true,
}));
```

### 3. Rate Limiting
Already implemented in `server/src/middleware/index.ts`

### 4. Input Validation
- Sanitize all user inputs
- Validate request bodies
- Use TypeScript for type safety

### 5. HTTPS
Always use HTTPS in production:
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    # ... rest of config
}
```

### 6. Database Security
- Backup SQLite database regularly
- Implement access controls
- Monitor for suspicious queries

---

## Monitoring & Maintenance

### Health Check Endpoint
```bash
curl http://localhost:3001/health
```

### Logs
```bash
# View logs
docker-compose logs -f

# Tail specific service
docker-compose logs -f backend

# View last 100 lines
docker-compose logs --tail=100
```

### Database Backup
```bash
# Backup SQLite database
cp server/data/history.db backups/history-$(date +%Y%m%d).db

# Automated daily backup
0 2 * * * cp /path/to/history.db /backups/history-$(date +\%Y\%m\%d).db
```

### Performance Monitoring
- Monitor API response times
- Track AI API usage
- Monitor memory/CPU usage
- Set up alerts for failures

---

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3001
lsof -i :3001
# Kill the process
kill -9 <PID>
```

### Database Locked
```bash
# Stop all connections
docker-compose down
# Restart
docker-compose up -d
```

### Build Failures
```bash
# Clear node_modules and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Memory Issues
Increase Node.js memory limit:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

---

## Scaling

### Horizontal Scaling
- Deploy multiple backend instances
- Use load balancer (Nginx, HAProxy)
- Share SQLite database via network storage or migrate to PostgreSQL

### Vertical Scaling
- Increase instance size
- Optimize code and queries
- Implement caching (Redis)

### CDN Integration
- Use CloudFlare or AWS CloudFront for static assets
- Enable gzip compression
- Implement asset caching

---

## Rollback Procedure

1. **Identify Last Good Version:**
```bash
git log --oneline
```

2. **Revert to Previous Version:**
```bash
git revert <commit-hash>
git push
```

3. **Redeploy:**
```bash
docker-compose down
docker-compose up -d --build
```

---

## Support

For deployment issues:
- Check application logs
- Review this documentation
- Contact DevOps team
- Submit incident report
