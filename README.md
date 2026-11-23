# Mona Mahmoud Abdelmenem — Portfolio

A white-and-pink portfolio with a real Supabase backend: assignments, projects, file storage, an in-browser code viewer, sandboxed website previews, and an admin dashboard.

## Setup (about 10 minutes, no coding)

1. **Create a Supabase project.** Go to https://supabase.com, sign up, click **New project**, pick a name and database password, and wait until it is ready.
2. **Find your Project URL.** Open **Project Settings → API**. Copy **Project URL**.
3. **Find your public key.** On the same page copy the **anon / publishable** key. Never copy the `service_role` key.
4. **Run the database file.** Open **SQL Editor → New query**, paste everything from `database/schema.sql`, click **Run**. This creates the tables, the 3 storage buckets (`assignment-files`, `project-files`, `project-images`) and all security policies. You do not need to create anything by hand.
5. **Paste your credentials.** Open `js/config.js` and replace `YOUR-PROJECT` URL and `YOUR-ANON-OR-PUBLISHABLE-KEY`.
6. **Create your admin account.** In Supabase open **Authentication → Users → Add user → Create new user**. Use `m8457701@gmail.com`, choose a password, and tick **Auto Confirm User**. Then open **Authentication → Sign In / Providers** and turn **off** "Allow new users to sign up" so nobody else can register. Even if someone did, the database only lets `m8457701@gmail.com` write (see `is_admin()` in `schema.sql`).
7. **Run the website.** Browsers block modules from `file://`, so serve the folder:
   - VS Code: install **Live Server**, right-click `index.html` → *Open with Live Server*, or
   - Terminal: `python -m http.server 8000` inside this folder, then open http://localhost:8000
8. **Sign in** at `/login.html`. Once logged in, "Add Assignment" / "Add Project" and Edit/Delete buttons appear on the site.
9. **Deploy.** Drag the whole folder onto https://app.netlify.com/drop (or use Vercel, Cloudflare Pages, or GitHub Pages). In Supabase **Authentication → URL Configuration** add your live site address as the Site URL.

## Change your photo
Replace `assets/images/profile.svg` with your own image (keep the name, or edit `index.html`).

## Security notes
- Only the public anon key is in the frontend. Real protection is Row Level Security.
- Uploaded HTML previews run in an iframe with `sandbox="allow-scripts"` and no `allow-same-origin`.
- Limits: 50 MB per file (Supabase free plan). To raise it, upgrade the plan and edit `MAX` in `js/uploads.js` and the bucket limits in `schema.sql`.
- Deleting a record removes its files from Storage first (done in the app code, since SQL cannot safely delete storage files).

## Structure
`index.html, login.html, dashboard.html` · `css/` · `js/` (`section.js` is the shared assignments/projects engine) · `database/schema.sql`
