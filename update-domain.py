#!/usr/bin/env python3
"""
Update the site domain in all files.
Run this after deploying to a new domain.
"""

import os
import re

# CHANGE THIS to your new domain
DOMAIN = "https://YOUR-DOMAIN-HERE.com"


def update_file(filepath):
    with open(filepath, "r") as f:
        content = f.read()

    # Replace the old domain with placeholder
    old_domain = "https://openclacode.netlify.app"
    new_content = content.replace(old_domain, "{{SITE_DOMAIN}}")

    if new_content != content:
        with open(filepath, "w") as f:
            f.write(new_content)
        return True
    return False


def main():
    # Update config.js
    config_js = """// Update this to your domain
window.SITE_CONFIG = {
  domain: 'https://YOUR-DOMAIN-HERE.com'
};
"""
    with open("config.js", "w") as f:
        f.write(config_js.replace("https://YOUR-DOMAIN-HERE.com", DOMAIN))
    print("Updated config.js")

    # Update all HTML files
    count = 0
    for root, dirs, files in os.walk("."):
        # Skip .git and node_modules
        if ".git" in root or "node_modules" in root:
            continue
        for file in files:
            if file.endswith(".html"):
                filepath = os.path.join(root, file)
                if update_file(filepath):
                    count += 1
                    print(f"Updated: {filepath}")

    # Update cli.sh
    with open("cli.sh", "r") as f:
        cli_content = f.read()

    cli_content = cli_content.replace(
        "https://openclacode.netlify.app", "{{SITE_DOMAIN}}"
    )
    cli_content = cli_content.replace("https://YOUR-DOMAIN-HERE.com", DOMAIN)

    with open("cli.sh", "w") as f:
        f.write(cli_content)
    print("Updated cli.sh")

    print(f"\nTotal files updated: {count}")
    print(f"New domain: {DOMAIN}")
    print("\nTo customize the domain, edit config.js or run:")
    print("  python update-domain.py")
    print("\nThen commit and push to redeploy.")


if __name__ == "__main__":
    main()
