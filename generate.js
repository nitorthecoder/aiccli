const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('components.json', 'utf8'));

const template = (content, title, breadcrumb) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Claude Code Templates</title>
  <link rel="stylesheet" href="/_astro/_type_.GXafhj3t.css">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; background: #0a0a0a; color: #e5e5e5; }
    .header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
    .logo { width: 40px; height: 40px; }
    .back { color: #a3e635; text-decoration: none; margin-bottom: 1rem; display: inline-block; }
    pre { background: #1a1a1a; padding: 1rem; border-radius: 8px; overflow-x: auto; border: 1px solid #333; }
    .meta { color: #888; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <a href="/" class="back">← Back to Claude Code Templates</a>
  <h1>${title}</h1>
  <div class="meta">${breadcrumb}</div>
  ${content}
</body>
</html>`;

const indexTemplate = (components, type) => `# ${type.charAt(0).toUpperCase() + type.slice(1)} Directory

${components.map(c => `- [${c.name}](${c.path.replace('.md', '.html')})`).join('\n')}
`;

const generatePages = () => {
  let total = 0;
  
  for (const [type, items] of Object.entries(data)) {
    if (!Array.isArray(items)) continue;
    total += items.length;
    
    // Generate directory listing
    const dirPath = path.join(__dirname, type);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    
    fs.writeFileSync(path.join(dirPath, 'README.md'), indexTemplate(items, type));
    
    // Generate individual pages
    for (const item of items) {
      const dir = path.join(__dirname, type, item.category || 'general');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      
      const content = item.content || item.description || 'No content available.';
      const htmlContent = `<pre style="white-space: pre-wrap; word-wrap: break-word;">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
      
      const fileName = item.name + '.html';
      const filePath = path.join(dir, fileName);
      
      fs.writeFileSync(filePath, template(
        htmlContent,
        item.name,
        `Category: ${item.category || 'general'} | Type: ${item.type || type}`
      ));
      
      item.path = `${type}/${item.category || 'general'}/${item.name}.html`;
    }
    
    console.log(`Generated ${items.length} ${type}`);
  }
  
  // Update components.json with new paths
  fs.writeFileSync('components.json', JSON.stringify(data, null, 2));
  
  // Generate main index
  const indexContent = Object.entries(data).map(([type, items]) => 
    `<h2>${type.charAt(0).toUpperCase() + type.slice(1)} (${items.length})</h2>
     <ul>${items.slice(0, 20).map(i => `<li><a href="${i.path}">${i.name}</a></li>`).join('')}</ul>
     ${items.length > 20 ? `<p><a href="${type}/">View all ${items.length} →</a></p>` : ''}`
  ).join('\n');
  
  fs.writeFileSync('index-generated.html', template(indexContent, 'Claude Code Templates', 'Open Source Component Library'));
  
  console.log(`\nTotal: ${total} components generated`);
};

generatePages();
