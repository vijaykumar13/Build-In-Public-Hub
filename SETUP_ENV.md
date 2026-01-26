# Environment Setup Guide

To make the app fully functional with real data, you need to replace the mock values in `web/.env.local` with real API keys.

## 1. Supabase (Database)
1.  **Create a Project**: Go to [Supabase Database](https://supabase.com/dashboard) and create a new project.
2.  **Get API Credentials**:
    *   Go to **Project Settings** (the gear icon) → **API**.
    *   Find the **Project URL** and copy it to `NEXT_PUBLIC_SUPABASE_URL`.
    *   Find the **Project API keys** section:
        *   Copy the `anon` / `public` key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
        *   Copy the `service_role` / `secret` key to `SUPABASE_SERVICE_ROLE_KEY`.

> [!CAUTION]
> Never expose the `service_role` key in the frontend code. That is why it does NOT have the `NEXT_PUBLIC_` prefix; it is only for the scripts.

3.  **Run the Schema**:
    *   Go to the **SQL Editor** in the Supabase sidebar.
    *   Copy the contents of `web/supabase_schema.sql` and paste it there.
    *   Click **Run** to create the tables.

## 2. GitHub (Data Source)
1.  **Generate Token**: Go to [GitHub Developer Settings](https://github.com/settings/tokens).
2.  **Create Personal Access Token (Classic)**:
    *   Click **Generate new token (classic)**.
    *   Give it a note (e.g., "BuildInPublicHub").
    *   **Scopes**: Check `repo` (for commit stats) and `read:user` (for profile info).
    *   Scroll down and click **Generate token**.
3.  **Copy Token**: Copy the token string (starts with `ghp_...`) to `GITHUB_TOKEN` in your `.env.local`.

## 3. GitHub OAuth (Login)
1.  **New OAuth App**: Go to [GitHub Developer Settings -> OAuth Apps](https://github.com/settings/developers).
2.  **Register a new application**:
    *   **Application Name**: Build In Public Hub
    *   **Homepage URL**: `http://localhost:3000`
    *   **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
3.  **Get Credentials**:
    *   Copy **Client ID** to `GITHUB_ID` in `.env.local`.
    *   Generate a **Client Secret** and copy it to `GITHUB_SECRET` in `.env.local`.
4.  **NextAuth Secret**:
    *   Run `openssl rand -base64 32` (or just type a random string for dev) and save it as `NEXTAUTH_SECRET`.

## Final `.env.local` Example
```env
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GITHUB_TOKEN=ghp_1234567890abcdef...

# Authentication
GITHUB_ID=Ov23li...
GITHUB_SECRET=123098...
NEXTAUTH_SECRET=random_secure_string_here
NEXTAUTH_URL=http://localhost:3000
```
