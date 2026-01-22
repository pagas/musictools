# Deployment Guide

## Easiest & Cheapest Options (All FREE)

### Option 1: Vercel (Recommended - Easiest)

**Steps:**
1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/slowdown.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) and sign up with GitHub

3. Click "New Project" → Import your GitHub repository

4. Vercel will auto-detect Vue.js and configure everything automatically

5. Click "Deploy" - your app will be live in ~2 minutes!

**Cost:** FREE forever (for personal projects)
**URL:** `https://your-project-name.vercel.app`

---

### Option 2: Netlify (Also Very Easy)

**Steps:**
1. Push code to GitHub (same as above)

2. Go to [netlify.com](https://netlify.com) and sign up with GitHub

3. Click "Add new site" → "Import an existing project"

4. Select your repository

5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

6. Click "Deploy site"

**Cost:** FREE forever
**URL:** `https://your-project-name.netlify.app`

---

### Option 3: Cloudflare Pages (Also Free)

**Steps:**
1. Push code to GitHub

2. Go to [pages.cloudflare.com](https://pages.cloudflare.com)

3. Sign up and connect GitHub

4. Select repository and configure:
   - Build command: `npm run build`
   - Build output directory: `dist`

5. Deploy

**Cost:** FREE
**URL:** `https://your-project-name.pages.dev`

---

### Option 4: GitHub Pages (Free but requires more setup)

**Steps:**
1. Install GitHub Pages plugin:
   ```bash
   npm install --save-dev vite-plugin-gh-pages
   ```

2. Update `vite.config.js`:
   ```js
   import { defineConfig } from 'vite'
   import vue from '@vitejs/plugin-vue'
   import ghPages from 'vite-plugin-gh-pages'

   export default defineConfig({
     plugins: [vue(), ghPages()],
     base: '/slowdown/' // Your repo name
   })
   ```

3. Build and deploy:
   ```bash
   npm run build
   npx gh-pages -d dist
   ```

4. Enable GitHub Pages in repo settings → Pages → Source: `gh-pages` branch

**Cost:** FREE
**URL:** `https://YOUR_USERNAME.github.io/slowdown/`

---

## Recommendation

**Use Vercel** - it's the easiest:
- ✅ Zero configuration needed
- ✅ Automatic deployments on every git push
- ✅ Free SSL certificate
- ✅ Global CDN
- ✅ Custom domain support (free)
- ✅ Preview deployments for pull requests

Just push to GitHub and connect to Vercel - that's it!
