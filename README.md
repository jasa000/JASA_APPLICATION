
# Jasa Essential - In-Depth Project Architecture

Welcome to the Jasa Essential application! This document provides a comprehensive overview of the project's architecture and deployment instructions.

## High-Level Overview

This is a modern, full-stack e-commerce and management application built on the Next.js App Router.
- **Framework**: Next.js 15 (React 18/19)
- **Styling**: Tailwind CSS with ShadCN UI
- **Backend**: Firebase (Firestore, Authentication)
- **Services**: Cloudinary (Product Images), Google Drive (User Documents)

---

## Deployment to Netlify

For the application to function correctly in production, you must configure your environment variables.

### Part 1: Environment Variables

Add the following variables to your Netlify site configuration (**Site settings > Build & deploy > Environment > Environment variables**).

**1. Firebase (Public):**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

**2. Cloudinary (Server-side):**
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

**3. Google Drive API (Server-side):**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_REDIRECT_URI`: Should match the one configured in Google Cloud Console.
- `GOOGLE_FOLDER_ID`: (Optional but Recommended) Create a folder in Google Drive and paste its ID here to keep uploads organized.

### Part 2: Google Cloud Authorization

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services > Credentials**.
3. Under **OAuth 2.0 Client IDs**, edit your client ID.
4. Add your Netlify URL (e.g., `https://your-site.netlify.app`) to **Authorized JavaScript origins**.
5. Ensure the **Authorized redirect URIs** includes `https://developers.google.com/oauthplayground` (if you used it to get the refresh token) and your site URL.

---

## Project Structure

- `src/app`: Next.js App Router pages and API routes.
- `src/components`: Reusable UI components (ShadCN).
- `src/context`: React Context providers for Auth, Cart, Notifications, and Theme.
- `src/lib`: Core logic, database functions, and external service clients.
- `firestore.rules`: Security rules for the database.

## Git Repository
This project is connected to: `https://github.com/Rahulr16184/jasa.git`
