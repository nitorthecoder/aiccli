#!/usr/bin/env python3
"""
Add config.js include and runtime replacement to HTML files.
"""

import os

CONFIG_SCRIPT = """  <script src="config.js"></script>
  <script>
    if (window.SITE_CONFIG && window.SITE_CONFIG.domain) {
      var domain = window.SITE_CONFIG.domain;
      document.body.innerHTML = document.body.innerHTML.replace(/\\{\\{SITE_DOMAIN\\}\\}/g, domain);
    }
  </script>
"""


def add_config_to_file(filepath):
    with open(filepath, "r") as f:
        content = f.read()

    # Check if already has config.js
    if "config.js" in content:
        return False

    # Check if has {{SITE_DOMAIN}}
    if "{{SITE_DOMAIN}}" not in content:
        return False

    # Add script before </body>
    if "</body>" in content:
        new_content = content.replace("</body>", CONFIG_SCRIPT + "</body>")
        with open(filepath, "w") as f:
            f.write(new_content)
        return True

    return False


def main():
    count = 0
    for root, dirs, files in os.walk("."):
        if ".git" in root or "node_modules" in root:
            continue
        for file in files:
            if file.endswith(".html"):
                filepath = os.path.join(root, file)
                if add_config_to_file(filepath):
                    count += 1
                    print(f"Updated: {filepath}")

    print(f"\nTotal files updated: {count}")


if __name__ == "__main__":
    main()
