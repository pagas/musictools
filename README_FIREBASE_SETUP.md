# Firebase Authentication Setup

This project uses Firebase Authentication with Email/Password. Follow these steps to set it up:

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

## 2. Enable Email/Password Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Click on **Email/Password** provider
3. Enable it (toggle the "Enable" switch)
4. Optionally enable "Email link (passwordless sign-in)" if desired
5. Save the changes

## 3. Get Your Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. Click the web icon (`</>`) to add a web app
4. Register your app (you can use any app nickname)
5. Copy the Firebase configuration object

## 4. Set Up Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and replace the placeholder values with your actual Firebase config values:

   ```env
   VITE_FIREBASE_API_KEY=your_actual_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

3. The `.env` file is already in `.gitignore`, so your secrets won't be committed to version control.

## 5. Configure Authorized Domains

1. In Firebase Console, go to **Authentication** > **Settings** > **Authorized domains**
2. Add your domain (e.g., `localhost` for development, your production domain)

## Features

- ✅ Email/Password authentication
- ✅ User registration (sign up)
- ✅ User login (sign in)
- ✅ Protected routes: Performance View and Multi-Track Editor require authentication
- ✅ User profile display in header
- ✅ Sign out functionality
- ✅ Automatic redirect to login when accessing protected routes

## Development

For local development, make sure `localhost` is in your authorized domains in Firebase Console.

## Password Requirements

Firebase requires passwords to be at least 6 characters long. The UI enforces this minimum length requirement.
