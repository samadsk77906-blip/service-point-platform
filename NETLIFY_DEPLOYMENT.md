# 🚀 Netlify Deployment Guide - Service Point Platform

## 📋 Prerequisites
- GitHub account
- Netlify account
- MongoDB Atlas database (already set up)

## 🔧 Environment Variables

You need to set these environment variables in Netlify:

### Required Environment Variables:
```
MONGODB_URI=mongodb+srv://samadsk77906_db_user:ikdpGNoFIZ5oILqr@samshiv77866.lm0racs.mongodb.net/test?retryWrites=true&w=majority&appName=SAMSHIV77866

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

NODE_ENV=production

EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=pointservice041@gmail.com
EMAIL_PASSWORD=tokd kxix yaks jgzl
EMAIL_FROM_NAME=Service Point Platform

FRONTEND_URL=https://your-netlify-site-name.netlify.app
```

## 🎯 Step-by-Step Deployment

### 1. Push to GitHub
```bash
# Initialize git repository (if not already done)
git init
git add .
git commit -m "Initial commit - Service Point Platform ready for deployment"

# Push to GitHub
git remote add origin https://github.com/yourusername/service-point-platform.git
git push -u origin main
```

### 2. Connect to Netlify

1. **Login to Netlify**: Go to https://netlify.com and sign in
2. **New Site from Git**: Click "New site from Git"
3. **Connect to GitHub**: Choose GitHub and authorize Netlify
4. **Select Repository**: Choose your service-point-platform repository
5. **Configure Build Settings**:
   - **Build Command**: `echo 'No build step required'`
   - **Publish Directory**: `frontend`
   - **Functions Directory**: `netlify/functions`

### 3. Configure Environment Variables

In Netlify Dashboard:
1. Go to **Site settings** > **Environment variables**
2. Add all the environment variables listed above
3. **Important**: Update `FRONTEND_URL` with your actual Netlify URL

### 4. Update CORS Configuration

After deployment, update the CORS configuration in `netlify/functions/api.js`:
```javascript
origin: [
  'https://your-actual-netlify-url.netlify.app', // Replace with your real URL
  'http://localhost:3001', // For local development
],
```

## 📁 Project Structure for Netlify

```
service-point-platform/
├── frontend/              (Published to Netlify)
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── *.html
├── netlify/
│   └── functions/
│       ├── api.js         (Main serverless function)
│       └── package.json
├── backend/               (Used by functions)
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   └── services/
├── netlify.toml          (Netlify configuration)
└── package.json
```

## 🔧 Build Process

1. **Frontend**: Static files served directly from `/frontend` directory
2. **Backend**: Runs as serverless functions via `/netlify/functions/api.js`
3. **Database**: MongoDB Atlas (cloud-hosted)
4. **Routing**: `/api/*` routes redirect to serverless functions

## 📱 Access URLs

After deployment:
- **Frontend**: https://your-site-name.netlify.app
- **API**: https://your-site-name.netlify.app/api/
- **Admin**: https://your-site-name.netlify.app/admin-login.html
- **Garage**: https://your-site-name.netlify.app/garage-login.html

## 🐛 Troubleshooting

### Common Issues:

1. **API Routes Not Working**:
   - Check environment variables are set
   - Verify MongoDB connection string
   - Check Netlify function logs

2. **CORS Errors**:
   - Update CORS origin in `netlify/functions/api.js`
   - Ensure FRONTEND_URL matches your Netlify URL

3. **Database Connection Issues**:
   - Verify MongoDB Atlas allows connections from all IPs (0.0.0.0/0)
   - Check MONGODB_URI environment variable

### View Logs:
- Netlify Dashboard > Functions > View logs
- Real-time function logs available during testing

## ✅ Post-Deployment Checklist

- [ ] Site loads correctly
- [ ] API endpoints respond
- [ ] User registration works
- [ ] Booking system functions
- [ ] Email notifications work
- [ ] Admin dashboard accessible
- [ ] Garage dashboard functional
- [ ] Mobile responsive design works

## 🔄 Updates and Redeployment

To update your site:
1. Make changes to your code
2. Push to GitHub
3. Netlify will automatically rebuild and deploy

## 🎉 Success!

Your Service Point Platform should now be live on Netlify with full functionality!