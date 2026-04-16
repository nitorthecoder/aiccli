#!/bin/bash

# AICCLI - AI Components CLI
# Usage: curl -sL https://openclacode.netlify.app/cli.sh | bash -s install skills/web-scraping

SITE_URL="https://openclacode.netlify.app"
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
${CYAN}${SITE_URL}${NC}

${CYAN}Quick Install (no setup):${NC}
  curl -sL ${SITE_URL}/cli.sh | bash -s install skills/web-scraping

${CYAN}Commands:${NC}
  install <type>/<name>   Install a component
  list [type]             List components
  search <query>          Search components
  browse                  Open website

${CYAN}Examples:${NC}
  curl -sL ${SITE_URL}/cli.sh | bash -s install skills/web-scraping
  curl -sL ${SITE_URL}/cli.sh | bash -s install agents/code-reviewer
  curl -sL ${SITE_URL}/cli.sh | bash -s install commands/deploy

${CYAN}Types:${NC}
  agents, skills, commands, mcps, hooks, settings
"
}

install_component() {
    local type="$1"
    local name="$2"
    local url="${SITE_URL}/${type}/${name}/${name}.html"
    
    info "Fetching ${type}/${name}..."
    
    mkdir -p "${INSTALL_DIR}/${type}"
    
    local html=$(curl -sL "$url")
    
    local config=$(echo "$html" | grep -oP '(?<=<pre[^>]*id="config"[^>]*><code>)[^<]+' | head -1)
    
    if [ -z "$config" ]; then
        config=$(echo "$html" | grep -oP '(?<=id="install-full">)[^<]+' | head -1)
    fi
    
    config=$(echo "$config" | sed 's/&lt;/</g; s/&gt;/>/g; s/&amp;/\&/g; s/&quot;/"/g; s/&#039;/'"'"'/g')
    
    if [ -n "$config" ] && [ "$config" != "null" ]; then
        echo "$config" > "${INSTALL_DIR}/${type}/${name}.json"
        log "Installed ${type}/${name}"
        info "Saved to: ${INSTALL_DIR}/${type}/${name}.json"
    else
        error "Could not fetch config for ${type}/${name}"
        error "Check: ${url}"
    fi
}

list_components() {
    local type="$1"
    info "Fetching from ${SITE_URL}..."
    
    if [ -n "$type" ]; then
        info "Fetching ${type} list..."
        local count=$(curl -sL "${SITE_URL}/components.json" | grep -oP "\"${type}\":\[" | wc -l)
        info "Found ${count} ${type}"
        curl -sL "${SITE_URL}/components.json" | grep -oP '(?<=  "name": ")[^"]+' | head -20
    else
        info "Fetching all components..."
        curl -sL "${SITE_URL}/components.json" | grep -oP '(?<=  "name": ")[^"]+' | head -30
    fi
}

search_components() {
    local query="$1"
    info "Searching for: ${query}"
    curl -sL "${SITE_URL}/components.json" | grep -i "$query" | head -10 || warn "No results"
}

browse() {
    info "Opening ${SITE_URL}..."
    if command -v xdg-open &> /dev/null; then
        xdg-open "${SITE_URL}"
    elif command -v open &> /dev/null; then
        open "${SITE_URL}"
    else
        info "Open: ${SITE_URL}"
    fi
}

CMD="${1:-help}"
shift 2>/dev/null || true

case "$CMD" in
    install)
        if [ -z "$1" ]; then
            error "Usage: cli.sh install <type>/<name>"
            exit 1
        fi
        IFS='/' read -r type name <<< "$1"
        if [ -z "$type" ] || [ -z "$name" ]; then
            error "Usage: cli.sh install <type>/<name>"
            exit 1
        fi
        install_component "$type" "$name"
        ;;
    list)
        list_components "$1"
        ;;
    search)
        if [ -z "$1" ]; then
            error "Usage: cli.sh search <query>"
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
