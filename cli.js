#!/usr/bin/env node

/**
 * AICCLI - AI Components CLI
 * 
 * Usage:
 *   aiccli install <type>/<name>    Install a specific component
 *   aiccli install <type>          Install all of a type
 *   aiccli list [type]             List available components
 *   aiccli search <query>         Search for components
 *   aiccli browse                  Open website in browser
 * 
 * Install:
 *   npm install -g aiccli
 *   OR
 *   npx aiccli
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SITE_URL = 'https://openclacode.netlify.app';
const COMPONENTS_URL = `${SITE_URL}/components.json`;

const TYPES = ['agents', 'skills', 'commands', 'mcps', 'hooks', 'settings'];

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function error(message) {
  log(`Error: ${message}`, 'red');
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function info(message) {
  log(message, 'cyan');
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        fetchJson(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse JSON'));
        }
      });
    }).on('error', reject);
  });
}

async function fetchText(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        fetchText(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function getComponents() {
  try {
    return await fetchJson(COMPONENTS_URL);
  } catch (e) {
    error('Failed to fetch components from website');
    return {};
  }
}

async function getComponentConfig(type, category, name) {
  const url = `${SITE_URL}/${type}/${category}/${name}.html`;
  try {
    const html = await fetchText(url);
    const match = html.match(/<pre[^>]*id="config"[^>]*><code>([\s\S]*?)<\/code><\/pre>/);
    if (match) {
      return decodeHtmlEntities(match[1]);
    }
    // Try alternative pattern
    const altMatch = html.match(/id="install-cmd"[^>]*><code>([\s\S]*?)<\/code>/);
    if (altMatch) {
      return decodeHtmlEntities(altMatch[1]);
    }
    return null;
  } catch (e) {
    return null;
  }
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function getInstallPath(type, name) {
  const baseDir = path.join(process.cwd(), '.aiccli');
  const typeMap = {
    agents: 'agents',
    skills: 'skills',
    commands: 'commands',
    mcps: 'mcps',
    hooks: 'hooks',
    settings: 'settings'
  };
  return path.join(baseDir, typeMap[type] || type, `${name}.json`);
}

async function installComponent(type, category, name) {
  const config = await getComponentConfig(type, category, name);
  
  if (!config) {
    error(`Could not fetch config for ${type}/${name}`);
    return false;
  }

  const installPath = getInstallPath(type, name);
  const installDir = path.dirname(installPath);
  
  if (!fs.existsSync(installDir)) {
    fs.mkdirSync(installDir, { recursive: true });
  }

  fs.writeFileSync(installPath, config);
  success(`Installed ${type}/${name}`);
  info(`Saved to: ${installPath}`);
  return true;
}

async function listComponents(type = null, search = null) {
  const data = await getComponents();
  const types = type ? [type] : TYPES;
  
  for (const t of types) {
    if (!data[t] || !Array.isArray(data[t])) continue;
    
    let items = data[t];
    
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }
    
    if (items.length === 0) continue;
    
    log(`\n${COLORS.bright}${t} (${items.length})${COLORS.reset}`, 'blue');
    items.forEach(item => {
      const name = `${COLORS.green}${item.name}${COLORS.reset}`;
      const cat = `${COLORS.cyan}[${item.category || 'general'}]${COLORS.reset}`;
      const desc = (item.description || '').substring(0, 60);
      console.log(`  ${name} ${cat} - ${desc}...`);
    });
  }
}

async function searchComponents(query) {
  const data = await getComponents();
  const results = [];
  
  for (const [type, items] of Object.entries(data)) {
    if (!Array.isArray(items)) continue;
    
    items.forEach(item => {
      const name = item.name.toLowerCase();
      const desc = (item.description || '').toLowerCase();
      if (name.includes(query.toLowerCase()) || desc.includes(query.toLowerCase())) {
        results.push({ type, ...item });
      }
    });
  }
  
  if (results.length === 0) {
    info(`No components found matching "${query}"`);
    return;
  }
  
  log(`\nFound ${results.length} components:\n`, 'green');
  results.forEach(item => {
    const name = `${COLORS.green}${item.type}/${item.name}${COLORS.reset}`;
    console.log(`  ${name}`);
    console.log(`    ${(item.description || '').substring(0, 80)}...`);
    console.log();
  });
}

function browse() {
  const url = SITE_URL;
  info(`Opening ${url}...`);
  
  try {
    if (process.platform === 'win32') {
      execSync(`start ${url}`, { stdio: 'ignore' });
    } else if (process.platform === 'darwin') {
      execSync(`open ${url}`, { stdio: 'ignore' });
    } else {
      execSync(`xdg-open ${url}`, { stdio: 'ignore' });
    }
  } catch (e) {
    info(`Open this URL in your browser: ${url}`);
  }
}

async function install(type, name) {
  const data = await getComponents();
  
  if (!TYPES.includes(type)) {
    error(`Invalid type: ${type}`);
    log(`Valid types: ${TYPES.join(', ')}`, 'yellow');
    return;
  }
  
  if (name === 'all') {
    log(`Installing all ${type}...`, 'blue');
    const items = data[type] || [];
    let installed = 0;
    
    for (const item of items) {
      const category = item.category || 'general';
      const success = await installComponent(type, category, item.name);
      if (success) installed++;
    }
    
    success(`Installed ${installed} ${type}`);
    return;
  }
  
  // Find the component
  const items = data[type] || [];
  const item = items.find(i => i.name === name);
  
  if (!item) {
    error(`Component ${type}/${name} not found`);
    log(`Try: aiccli list ${type}`, 'yellow');
    return;
  }
  
  const category = item.category || 'general';
  await installComponent(type, category, name);
}

function showHelp() {
  console.log(`
${COLORS.bright}AICCLI - AI Components CLI${COLORS.reset}
${COLORS.cyan}https://openclacode.netlify.app${COLORS.reset}

${COLORS.bright}Usage:${COLORS.reset}
  aiccli install <type>/<name>   Install a component
  aiccli install <type> all     Install all components of a type
  aiccli list [type]             List available components
  aiccli search <query>          Search for components
  aiccli browse                  Open website in browser
  aiccli help                    Show this help

${COLORS.bright}Examples:${COLORS.reset}
  aiccli install skills/web-scraping
  aiccli install agents/code-reviewer
  aiccli install commands all
  aiccli list skills
  aiccli search database
  aiccli browse

${COLORS.bright}Types:${COLORS.reset}
  agents, skills, commands, mcps, hooks, settings

${COLORS.bright}Components are installed to:${COLORS.reset}
  .aiccli/<type>/<name>.json
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'install':
      if (!args[1]) {
        error('Usage: aiccli install <type>/<name>');
        return;
      }
      if (args[1].includes('/')) {
        const [type, name] = args[1].split('/');
        await install(type, name);
      } else {
        await install(args[1], args[2] || 'all');
      }
      break;
      
    case 'list':
      await listComponents(args[1], args[2]);
      break;
      
    case 'search':
      if (!args[1]) {
        error('Usage: aiccli search <query>');
        return;
      }
      await searchComponents(args.slice(1).join(' '));
      break;
      
    case 'browse':
      browse();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      if (command) {
        error(`Unknown command: ${command}`);
      }
      showHelp();
  }
}

main().catch(console.error);
