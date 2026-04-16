#!/bin/bash

# AICCLI - AI Components CLI
# Usage: curl -sL https://raw.githubusercontent.com/nitorthecoder/ccaitmpl/main/cli.sh | bash -s install skills/web-scraping

SITE_URL="https://openclacode.netlify.app"
BASE_URL="https://raw.githubusercontent.com/nitorthecoder/ccaitmpl/main"
INSTALL_DIR=".aiccli"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${CYAN}ℹ${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }

show_help() {
    echo -e "
${BLUE}AICCLI - AI Components CLI${NC}

${CYAN}Usage:${NC}
  aiccli install <type>/<name>   Install a component
  aiccli list [type]            List components
  aiccli search <query>         Search components
  aiccli browse                 Open website
  aiccli help                   Show this help

${CYAN}Quick Install (no setup):${NC}
  curl -sL ${BASE_URL}/cli.sh | bash -s install skills/web-scraping

${CYAN}Examples:${NC}
  aiccli install skills/web-scraping
  aiccli install agents/code-reviewer
  aiccli install commands/deploy

${CYAN}Types:${NC}
  agents, skills, commands, mcps, hooks, settings
"
}

install_component() {
    local type="$1"
    local name="$2"
    local url="${SITE_URL}/${type}/${name}/${name}.html"
    
    info "Fetching ${type}/${name}..."
    
    # Create directory
    mkdir -p "${INSTALL_DIR}/${type}"
    
    # Download and extract config
    local html=$(curl -sL "$url")
    
    # Extract from pre#config tag
    local config=$(echo "$html" | grep -oP '(?<=<pre[^>]*id="config"[^>]*><code>)[^<]+' | head -1)
    
    # Alternative extraction
    if [ -z "$config" ]; then
        config=$(echo "$html" | grep -oP '(?<=id="install-full">)[^<]+' | head -1)
    fi
    
    # Decode HTML entities
    config=$(echo "$config" | sed 's/&lt;/</g; s/&gt;/>/g; s/&amp;/\&/g; s/&quot;/"/g; s/&#039;/'"'"'/g')
    
    if [ -n "$config" ] && [ "$config" != "null" ]; then
        echo "$config" > "${INSTALL_DIR}/${type}/${name}.json"
        log "Installed ${type}/${name}"
        info "Saved to: ${INSTALL_DIR}/${type}/${name}.json"
    else
        error "Could not fetch config for ${type}/${name}"
        error "Check if the component exists at: ${url}"
    fi
}

list_components() {
    local type="$1"
    info "Fetching components from ${SITE_URL}..."
    
    local components=$(curl -sL "${SITE_URL}/components.json")
    
    if [ -n "$type" ]; then
        local items=$(echo "$components" | grep -oP "\"${type}\":\[[^\]]+\]" 2>/dev/null || echo "[]")
        info "Found components in ${type}:"
        echo "$components" | grep -oP '(?<=  "name": ")[^"]+' | head -20
    else
        info "All components available at: ${SITE_URL}"
        info "Types: agents, skills, commands, mcps, hooks, settings"
    fi
}

search_components() {
    local query="$1"
    info "Searching for: ${query}"
    
    local components=$(curl -sL "${SITE_URL}/components.json")
    
    info "Searching through components..."
    echo "$components" | grep -i "$query" | head -10 || warn "No results found"
}

browse() {
    info "Opening ${SITE_URL}..."
    if command -v xdg-open &> /dev/null; then
        xdg-open "${SITE_URL}"
    elif command -v open &> /dev/null; then
        open "${SITE_URL}"
    else
        info "Open this URL in your browser: ${SITE_URL}"
    fi
}

# Parse command
CMD="${1:-help}"
shift 2>/dev/null || true

case "$CMD" in
    install)
        if [ -z "$1" ]; then
            error "Usage: aiccli install <type>/<name>"
            exit 1
        fi
        IFS='/' read -r type name <<< "$1"
        if [ -z "$type" ] || [ -z "$name" ]; then
            error "Usage: aiccli install <type>/<name>"
            exit 1
        fi
        install_component "$type" "$name"
        ;;
    list)
        list_components "$1"
        ;;
    search)
        if [ -z "$1" ]; then
            error "Usage: aiccli search <query>"
            exit 1
        fi
        search_components "$1"
        ;;
    browse)
        browse
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        error "Unknown command: $CMD"
        show_help
        exit 1
        ;;
esac
