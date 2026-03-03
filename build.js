const fs = require('fs');
const path = require('path');
const md = require('markdown-it')({
  html: true,
  linkify: true,
  typographer: true
});
const matter = require('gray-matter');

const postsDir = path.join(__dirname, 'posts');
const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

// Create dist directory if it doesn't exist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Copy style.css to dist
fs.copyFileSync(path.join(srcDir, 'style.css'), path.join(distDir, 'style.css'));

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
    <a href="/">${isIndex ? '<h1>My Blog</h1>' : 'My Blog'}</a>
  </header>
  <main>
    ${content}
  </main>
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
          <time datetime="${data.date}">${new Date(data.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
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

// Build index
const indexContent = `
  <ul class="post-list">
    ${posts.map(post => `
      <li>
        <a href="/${post.slug}.html">${post.title}</a>
        <time>${new Date(post.date).toISOString().split('T')[0]}</time>
      </li>
    `).join('')}
  </ul>
`;

fs.writeFileSync(path.join(distDir, 'index.html'), template('My Blog', indexContent, true));

console.log('Build complete! Static files are in /dist');
