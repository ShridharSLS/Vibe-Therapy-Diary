# Deployment Guide - Vibe Therapy Diary

This guide will help you deploy the Vibe therapy diary web app to production.

## Prerequisites

1. **Firebase Project**: You need a Firebase project with Firestore enabled
2. **Node.js**: Version 16+ (current: 16.20.1)
3. **Firebase CLI**: Already installed locally in the project

## Step 1: Firebase Setup

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name: `vibe-therapy-diary` (or your choice)
4. Disable Google Analytics (optional)
5. Click "Create project"

### 1.2 Enable Firestore
1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode"
4. Select your preferred location
5. Click "Done"

### 1.3 Get Firebase Configuration
1. Go to Project Settings (gear icon)
2. Scroll to "Your apps" section
3. Click "Add app" → Web app (`</>`)
4. App name: `Vibe Therapy Diary`
5. Check "Firebase Hosting" (optional)
6. Click "Register app"
7. **Copy the config object**

### 1.4 Update Environment Variables
Update your `.env.local` file with the Firebase config:

```bash
# Replace with your actual Firebase config
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Change this to a secure password
ADMIN_PASSWORD=YourSecurePassword123
```

## Step 2: Test Locally

```bash
# Install dependencies (if not already done)
npm install

# Start development server
npm run dev

# Test the app at http://localhost:3000
# Try creating a diary and adding cards
```

## Step 3: Deploy to Firebase Hosting

### 3.1 Initialize Firebase
```bash
# Login to Firebase (this will open a browser)
npx firebase login

# Initialize Firebase in your project
npx firebase init
```

When prompted:
- **Features**: Select "Firestore" and "Hosting"
- **Project**: Choose your existing Firebase project
- **Firestore Rules**: Use existing `firestore.rules`
- **Firestore Indexes**: Use existing `firestore.indexes.json`
- **Public Directory**: Enter `out`
- **Single Page App**: Yes
- **Overwrite index.html**: No

### 3.2 Deploy
```bash
# Build and deploy
npm run firebase:deploy
```

This will:
1. Build the Next.js app
2. Export static files to `out/` directory
3. Deploy to Firebase Hosting
4. Deploy Firestore rules and indexes

### 3.3 Access Your App
After deployment, you'll get a URL like:
`https://your-project-id.web.app`

## Step 4: Alternative - Deploy to Vercel

### 4.1 Install Vercel CLI
```bash
npm install -g vercel
```

### 4.2 Deploy
```bash
# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name: vibe-therapy-diary
# - Directory: ./
# - Override settings? No
```

### 4.3 Set Environment Variables
In Vercel dashboard:
1. Go to your project
2. Settings → Environment Variables
3. Add all variables from `.env.local`

## Step 5: Production Configuration

### 5.1 Update Firestore Security Rules
For production, consider more restrictive rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // More restrictive rules for production
    match /diaries/{document} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
    
    match /cards/{document} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

### 5.2 Update Admin Password
Change the `ADMIN_PASSWORD` in your environment variables to a secure password.

### 5.3 Enable Firebase Authentication (Optional)
For better security, consider adding Firebase Authentication:
1. Enable Authentication in Firebase Console
2. Add sign-in methods (Email/Password, Google, etc.)
3. Update security rules to require authentication

## Step 6: Custom Domain (Optional)

### Firebase Hosting
1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter your domain
4. Follow DNS setup instructions

### Vercel
1. Go to Vercel Dashboard → Your Project
2. Settings → Domains
3. Add your custom domain
4. Follow DNS setup instructions

## Troubleshooting

### Common Issues

1. **Firebase Connection Error**
   - Check if environment variables are set correctly
   - Verify Firebase project ID matches

2. **Build Errors**
   - Run `npm run build` locally to test
   - Check for TypeScript errors

3. **Firestore Permission Denied**
   - Verify Firestore rules are deployed
   - Check if database is in the correct region

4. **Admin Dashboard Not Working**
   - Verify `ADMIN_PASSWORD` environment variable
   - Check browser console for errors

### Support Commands

```bash
# Check Firebase project
npx firebase projects:list

# Test Firestore rules locally
npx firebase emulators:start

# View deployment logs
npx firebase hosting:channel:list

# Rollback deployment
npx firebase hosting:channel:deploy --only hosting
```

## Security Checklist

- [ ] Changed default admin password
- [ ] Updated Firestore security rules
- [ ] Environment variables set in production
- [ ] HTTPS enabled (automatic with Firebase/Vercel)
- [ ] Consider adding Firebase Authentication
- [ ] Monitor usage in Firebase Console

## Monitoring

- **Firebase Console**: Monitor database usage, hosting traffic
- **Vercel Dashboard**: Monitor deployments, performance
- **Browser Console**: Check for client-side errors

Your Vibe therapy diary app is now ready for production use!
