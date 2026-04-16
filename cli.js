#!/usr/bin/env node

/**
 * AICCLI - AI Components Installer
 * 
 * Usage:
 *   npx aiccli install <type>/<name>    Install a specific component
 *   npx aiccli list                      List available components
 *   npx aiccli search <query>          Search for components
 *   npx aiccli init                     Initialize AICCLI in current project
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const BASE_URL = 'https://raw.githubusercontent.com/nitorthecoder/ccaitmpl/main';

const TYPES = ['agents', 'skills', 'commands', 'mcps', 'hooks', 'settings'];

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
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

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function fetchComponent(type, name) {
  const url = `${BASE_URL}/${type}/${name}/${name}.json`;
  try {
    return await fetchJson(url);
  } catch (e) {
    return null;
  }
}

async function installComponent(type, name, options = {}) {
  const data = await fetchComponent(type, name);
  
  if (!data) {
    error(`Component ${type}/${name} not found`);
    return false;
  }

  const dir = path.join(process.cwd(), '.opencode', type);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = path.join(dir, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  
  success(`Installed ${type}/${name}`);
  return true;
}

async function listComponents(type = null) {
  try {
    const data = await fetchJson(`${BASE_URL}/components.json`);
    
    const types = type ? [type] : TYPES;
    
    for (const t of types) {
      if (data[t] && Array.isArray(data[t])) {
        log(`\n${COLORS.bright}${t}:${COLORS.reset}`, 'blue');
        data[t].forEach(item => {
          console.log(`  ${item.name} - ${(item.description || '').substring(0, 60)}...`);
        });
      }
    }
  } catch (e) {
    error('Failed to fetch component list');
  }
}

async function searchComponents(query) {
  try {
    const data = await fetchJson(`${BASE_URL}/components.json`);
    const results = [];
    
    for (const [type, items] of Object.entries(data)) {
      if (Array.isArray(items)) {
        items.forEach(item => {
          const name = item.name.toLowerCase();
          const desc = (item.description || '').toLowerCase();
          if (name.includes(query.toLowerCase()) || desc.includes(query.toLowerCase())) {
            results.push({ type, ...item });
          }
        });
      }
    }
    
    if (results.length === 0) {
      log('No components found matching your search', 'yellow');
      return;
    }
    
    log(`\nFound ${results.length} components:`, 'green');
    results.forEach(item => {
      console.log(`\n${COLORS.bright}${item.type}/${item.name}${COLORS.reset}`);
      console.log(`  ${(item.description || '').substring(0, 80)}...`);
    });
  } catch (e) {
    error('Failed to search components');
  }
}

function initProject() {
  const config = {
    aiccli: {
      version: '1.0.0',
      components: []
    }
  };
  
  const configPath = path.join(process.cwd(), 'aiccli.config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  success('Initialized AICCLI in current project');
  console.log(`Created ${configPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'install':
      if (args[1] === 'all') {
        log('Installing all components...', 'blue');
        const data = await fetchJson(`${BASE_URL}/components.json`);
        for (const [type, items] of Object.entries(data)) {
          if (Array.isArray(items)) {
            for (const item of items) {
              await installComponent(type, item.name);
            }
          }
        }
        success('All components installed');
      } else if (args[1]) {
        const [type, name] = args[1].split('/');
        if (!TYPES.includes(type)) {
          error(`Invalid type: ${type}. Valid types: ${TYPES.join(', ')}`);
          process.exit(1);
        }
        await installComponent(type, name);
      } else {
        error('Usage: aiccli install <type>/<name>');
        process.exit(1);
      }
      break;
      
    case 'list':
      await listComponents(args[1] || null);
      break;
      
    case 'search':
      if (args[1]) {
        await searchComponents(args[1]);
      } else {
        error('Usage: aiccli search <query>');
        process.exit(1);
      }
      break;
      
    case 'init':
      initProject();
      break;
      
    case '--help':
    case 'help':
    default:
      console.log(`
${COLORS.bright}AICCLI - AI Components Installer${COLORS.reset}

${COLORS.bright}Usage:${COLORS.reset}
  npx aiccli install <type>/<name>  Install a component
  npx aiccli install all            Install all components
  npx aiccli list [type]           List available components
  npx aiccli search <query>        Search for components
  npx aiccli init                   Initialize in current project
  npx aiccli help                   Show this help message

${COLORS.bright}Types:${COLORS.reset}
  ${TYPES.join(', ')}

${COLORS.bright}Examples:${COLORS.reset}
  npx aiccli install agents/code-reviewer
  npx aiccli install skills/web-scraping
  npx aiccli list commands
  npx aiccli search database
`);
      break;
  }
}

main().catch(console.error);
