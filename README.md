# Simple Static Blog

A lightweight, zero-JS static blog generator inspired by Jekyll Minimal.

## Features
- Clean, readable typography.
- Markdown support via `markdown-it`.
- Fast, static HTML output in `dist/`.
- No client-side JavaScript.

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Add posts**:
   Create `.md` files in `posts/` with YAML frontmatter:
   ```markdown
   ---
   title: My New Post
   date: 2026-03-02
   ---
   Your content here...
   ```

3. **Build the site**:
   ```bash
   node build.js
   ```

4. **Preview locally**:
   Use any static server (e.g., `npx serve dist`).

## Production Deployment

Since the output is entirely static, you can host it anywhere:

### 1. Simple Server (e.g., Nginx or Apache)
Upload the contents of the `dist/` folder to your server's web root (e.g., `/var/www/html`).

### 2. GitHub Pages / Vercel / Netlify
Point the deployment directory to `dist/`. For example, on Vercel, use:
- **Build Command**: `node build.js`
- **Output Directory**: `dist`

### 3. Basic Nginx Config
```nginx
server {
    listen 80;
    server_name myblog.com;
    root /path/to/blog_simple/dist;
    index index.html;

    location / {
        try_files $uri $uri.html $uri/ =404;
    }
}
```

## Customizing Styles
Edit `src/style.css` to change fonts, colors, or layouts.
