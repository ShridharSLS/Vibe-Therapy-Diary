# Vibe - Therapy Diary Web App

A mobile-first collaborative therapy diary web app with clean, swipe-based cards. Each diary has a unique URL, editable by multiple users in real-time. Includes a password-protected Admin Dashboard.

## Features

- **Mobile-first design** with swipe gestures
- **Real-time collaboration** using Firebase Firestore
- **Unique diary URLs** for each client
- **Card-based interface** with Before/After types
- **Rich text editing** with character limits
- **Admin dashboard** with password protection
- **CSV export** functionality
- **Responsive design** for mobile and desktop

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Firebase:
   - Create a new Firebase project
   - Enable Firestore Database
   - Copy your Firebase config to `.env.local`

4. Configure environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Update `.env.local` with your Firebase configuration:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ADMIN_PASSWORD=your_secure_password
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Creating a New Diary

1. Visit the home page
2. Click "Create New Therapy Diary"
3. Fill in Client ID, Name, and Gender
4. Get your unique diary URL
5. Share the URL with collaborators

### Accessing a Diary

1. Visit the unique diary URL
2. Enter your Client ID
3. Start creating and editing cards

### Admin Dashboard

1. Visit `/admin`
2. Enter admin password (default: "Password")
3. View all diaries, search, and export data

## Card Features

- **Topic**: 1-2 lines, rich text editing
- **Type**: Before (red background) or After (blue background)
- **Body**: Rich text with 300 character limit
- **Controls**: Add, duplicate, edit, undo/redo, delete
- **Navigation**: Swipe or use arrow buttons

## Project Structure

```
├── app/
│   ├── admin/          # Admin dashboard
│   ├── diary/[id]/     # Individual diary pages
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/
│   ├── CardComponent.tsx    # Individual card component
│   └── DiaryInterface.tsx   # Main diary interface
├── lib/
│   ├── database.ts     # Firebase database operations
│   ├── firebase.ts     # Firebase configuration
│   ├── types.ts        # TypeScript type definitions
│   └── utils.ts        # Utility functions
└── public/             # Static assets
```

## Firebase Security Rules

Add these Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to diaries and cards
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy to your preferred platform (Vercel, Netlify, etc.)

3. Update Firebase configuration for production domain

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please contact the development team or create an issue in the repository.
