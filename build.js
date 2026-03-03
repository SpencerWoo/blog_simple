const fs = require('fs');
const path = require('path');
const md = require('markdown-it')({
  html: true,
  linkify: true,
  typographer: true
});
const matter = require('gray-matter');

const postsDir = path.join(__dirname, 'posts');
const pagesDir = path.join(__dirname, 'pages');
const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

// Create dist directory if it doesn't exist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Copy style.css to dist
fs.copyFileSync(path.join(srcDir, 'style.css'), path.join(distDir, 'style.css'));

// Helper to format date with 5-digit year (leading zero)
const formatLongDate = (dateStr) => {
  const date = new Date(dateStr);
  const year = date.getFullYear().toString().padStart(5, '0');
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const day = date.getDate();
  return `${month} ${day}, ${year}`;
};

const formatShortDate = (dateStr) => {
  const date = new Date(dateStr);
  const year = date.getFullYear().toString().padStart(5, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const template = (title, content, isIndex = false) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header>
    <a href="/">${isIndex ? '<h1>spencers.dev</h1>' : 'spencers.dev'}</a>
    <nav>
      <a href="/about.html">About</a>
    </nav>
  </header>
  <main>
    ${content}
  </main>
  <footer class="banner">
    Support via ETH, Base, Polygon : 0x325282bfda3Eb0Aa52C70989c61Ae218100Ffaa6
  </footer>
</body>
</html>
`;

// Build posts
const posts = fs.readdirSync(postsDir)
  .filter(file => file.endsWith('.md'))
  .map(file => {
    const filePath = path.join(postsDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);
    const htmlContent = md.render(content);
    const slug = file.replace('.md', '');
    const postHtml = template(data.title, `
      <article>
        <header>
          <h1>${data.title}</h1>
          <time datetime="${data.date}">${formatLongDate(data.date)}</time>
        </header>
        ${htmlContent}
      </article>
    `);

    fs.writeFileSync(path.join(distDir, `${slug}.html`), postHtml);

    return {
      title: data.title,
      date: data.date,
      slug: slug
    };
  })
  .sort((a, b) => new Date(b.date) - new Date(a.date));

// Build static pages (e.g., about.md)
if (fs.existsSync(pagesDir)) {
  fs.readdirSync(pagesDir)
    .filter(file => file.endsWith('.md'))
    .forEach(file => {
      const filePath = path.join(pagesDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContent);
      const htmlContent = md.render(content);
      const slug = file.replace('.md', '');
      const pageHtml = template(data.title, `
        <article>
          <header>
            <h1>${data.title}</h1>
          </header>
          ${htmlContent}
        </article>
      `);

      fs.writeFileSync(path.join(distDir, `${slug}.html`), pageHtml);
    });
}

// Build index
const indexContent = `
  <ul class="post-list">
    ${posts.map(post => `
      <li>
        <a href="/${post.slug}.html">${post.title}</a>
        <time>${formatShortDate(post.date)}</time>
      </li>
    `).join('')}
  </ul>
`;

fs.writeFileSync(path.join(distDir, 'index.html'), template('spencers.dev', indexContent, true));

console.log('Build complete! Static files are in /dist');
