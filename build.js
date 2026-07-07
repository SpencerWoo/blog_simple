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

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

fs.copyFileSync(path.join(srcDir, 'style.css'), path.join(distDir, 'style.css'));

const formatLongDate = (dateStr) => {
  const date = new Date(dateStr);
  const year = date.getFullYear().toString().padStart(5, '0');
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const day = date.getDate();
  return `${month} ${day}, ${year}`;
};

const template = (title, content, isIndex = false, extraHead = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="/style.css">
  ${extraHead}
</head>
<body>
  <header>
    <a href="/">${isIndex ? '<h1>blog.spencers.dev</h1>' : 'blog.spencers.dev'}</a>
    <nav>
      <a href="/about.html">About</a>
      <a href="/sitemap.html">Sitemap</a>
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

function extractInternalLinks(html, knownSlugs, sourceSlug) {
  const linkRegex = /<a[^>]*href="([^"]+)"/gi;
  const links = [];
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    if (href.startsWith('http') || href.startsWith('#') || href.startsWith('//') || href.startsWith('mailto:')) continue;
    const sourceDir = sourceSlug.includes('/') ? sourceSlug.substring(0, sourceSlug.lastIndexOf('/')) : '';
    const base = '/' + (sourceDir ? sourceDir + '/' : '');
    const resolved = path.posix.resolve(base, href).replace(/^\//, '').replace('.html', '');
    if (resolved && knownSlugs.has(resolved)) {
      links.push(resolved);
    }
  }
  return [...new Set(links)];
}

function walkDir(dir, baseDir = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const relPath = baseDir ? path.posix.join(baseDir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      files.push(...walkDir(path.join(dir, entry.name), relPath));
    } else if (entry.name.endsWith('.md')) {
      files.push(relPath);
    }
  }
  return files;
}

// Build posts
const posts = walkDir(postsDir)
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
          ${data.date ? `<time datetime="${data.date}">${formatLongDate(data.date)}</time>` : ''}
        </header>
        ${htmlContent}
      </article>
    `);

    const outPath = path.join(distDir, `${slug}.html`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, postHtml);

    return { title: data.title, date: data.date, slug, html: htmlContent };
  })
  .sort((a, b) => {
    if (a.date && b.date) return new Date(b.date) - new Date(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });

// Build static pages
const pages = [];
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

      pages.push({ title: data.title, slug, html: htmlContent });
    });
}

// Build graph data from internal links
const allNodes = [...posts, ...pages];
const knownSlugs = new Set(allNodes.map(n => n.slug));

const nodes = allNodes.map(n => ({ id: n.slug, title: n.title }));

const edgeSet = new Set();
const edges = [];
allNodes.forEach(source => {
  const targets = extractInternalLinks(source.html, knownSlugs, source.slug);
  targets.forEach(target => {
    if (target === source.slug) return;
    const key = `${source.slug}->${target}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({ source: source.slug, target });
    }
  });
});

const graphJson = JSON.stringify({ nodes, edges });

// Build sitemap page
const sitemapContent = `
  <article>
    <header>
      <h1>Sitemap</h1>
    </header>
    Another sitemap listing all links: 
    <ul>
      ${allNodes
        .sort((a, b) => a.title.localeCompare(b.title))
        .map(n => `<li><a href="/${n.slug}.html">${n.title}</a></li>`)
        .join('\n      ')}
    </ul>
  </article>
`;
fs.writeFileSync(path.join(distDir, 'sitemap.html'), template('Sitemap', sitemapContent));

// Build index with graph visualization
const indexContent = `
<div id="graph"></div>
<script>
(function() {
  var data = ${graphJson};

  var container = document.getElementById('graph');
  var width = container.clientWidth || 800;
  var height = Math.max(500, Math.min(800, width * 0.65));

  var svg = d3.select('#graph').append('svg')
    .attr('width', width)
    .attr('height', height);

  var g = svg.append('g');

  svg.call(d3.zoom().scaleExtent([0.3, 5]).on('zoom', function(event) {
    g.attr('transform', event.transform);
  }));

  var simulation = d3.forceSimulation(data.nodes)
    .force('link', d3.forceLink(data.edges).id(function(d) { return d.id; }).distance(80))
    .force('charge', d3.forceManyBody().strength(-150))
    .force('center', d3.forceCenter(width / 2, height / 2));

  var link = g.append('g')
    .selectAll('line')
    .data(data.edges)
    .join('line')
    .attr('stroke', '#ccc')
    .attr('stroke-width', 1);

  var node = g.append('g')
    .selectAll('g')
    .data(data.nodes)
    .join('g')
    .style('cursor', 'pointer')
    .call(d3.drag()
      .on('start', function(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', function(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', function(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }))
    .on('click', function(event, d) {
      window.location.href = '/' + d.id + '.html';
    });

  node.append('circle')
    .attr('r', 5)
    .attr('fill', '#007bff')
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5);

  node.append('text')
    .text(function(d) { return d.title; })
    .attr('x', 8)
    .attr('y', 4)
    .attr('font-size', '12px')
    .attr('fill', '#333');

  simulation.on('tick', function() {
    link
      .attr('x1', function(d) { return d.source.x; })
      .attr('y1', function(d) { return d.source.y; })
      .attr('x2', function(d) { return d.target.x; })
      .attr('y2', function(d) { return d.target.y; });
    node.attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
  });
})();
</script>
`;

fs.writeFileSync(path.join(distDir, 'index.html'), template('spencers.dev', indexContent, true, '<script src="https://d3js.org/d3.v7.min.js"></script>'));

console.log('Build complete! Static files are in /dist');
