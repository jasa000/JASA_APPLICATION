
# Jasa Essential - In-Depth Project Architecture

Welcome to the Jasa Essential application! This document provides a comprehensive overview of the project's architecture and deployment instructions.

## High-Level Overview

This is a modern, full-stack e-commerce and management application built on the Next.js App Router.
- **Framework**: Next.js 15 (React 18/19)
- **Styling**: Tailwind CSS with ShadCN UI
- **Backend**: Firebase (Firestore, Authentication)
- **Storage**: Supabase Storage (Xerox Documents & Product Images)

---

## Environment Variables

For the application to function correctly, you must configure your environment variables.

### Part 1: Firebase (Public)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Part 2: Supabase Storage (Public & Server-side)
- `NEXT_PUBLIC_SUPABASE_URL`: Found in Supabase Settings > API > Project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Found in Supabase Settings > API > service_role secret. **Keep this secret!**

---

## Supabase Setup Instructions

1. Go to the [Supabase Dashboard](https://app.supabase.com/).
2. Create a new project.
3. Click on **Storage** in the sidebar.
4. Create two **Public** buckets:
   - `jasa-documents`: For Xerox PDF uploads.
   - `jasa-essentials`: For product and banner images.
5. Add the URL and Service Role key to your environment variables.

---

## Project Structure

- `src/app`: Next.js App Router pages and API routes.
- `src/components`: Reusable UI components (ShadCN).
- `src/context`: React Context providers for Auth, Cart, Notifications, and Theme.
- `src/lib`: Core logic, database functions, and Supabase client.
- `firestore.rules`: Security rules for the database.

## Git Repository
This project is connected to: `https://github.com/jasaessential/JASA_WEBAPP.git`
