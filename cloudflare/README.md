# Cloudflare Workers for ExpenShare

This directory contains Cloudflare Workers designed to act as intelligent, permanent download links for ExpenShare releases.

## What is this for?
When distributing a desktop or mobile application, direct links to GitHub Releases or SourceForge often change with every new version (e.g., `v1.1.7` vs `v1.2.0`). Furthermore, some platforms (like Microsoft Store or specific download managers) require a direct `200 OK` response with the binary file, rather than a `302 Redirect` to a CDN.

These Cloudflare Workers solve these problems by:
1. **Providing a permanent, unchanging URL** (e.g., `https://download-exe.yourdomain.workers.dev`) that *always* serves the latest version.
2. **Handling redirects internally**, so the client receives a direct `200 OK` response with the actual binary file (`.exe`, `.msi`, or `.apk`), bypassing tricky redirects that some package managers or stores reject.
3. **Serving specific versions dynamically** (e.g., `?version=1.1.6`).

## Available Workers

- **`exe/`**: Fetches the latest Windows `.exe` installer from GitHub Releases.
- **`msi/`**: Fetches the latest Windows `.msi` installer from GitHub Releases.
- **`apk/`**: Fetches the latest Android `.apk` installer from GitHub Releases.
- **`msi-sourceforge/`**: Fetches the latest Windows `.msi` installer specifically from SourceForge's mirror network.

## How to Deploy

To deploy any of these workers, you will need a [Cloudflare](https://dash.cloudflare.com) account and Node.js installed on your machine.

1. **Install Wrangler CLI (if you haven't already):**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

3. **Deploy a specific worker:**
   Navigate into the folder of the worker you want to deploy (for example, the `exe` worker):
   ```bash
   cd cloudflare/exe
   npm install
   wrangler deploy
   ```

4. **Test the worker:**
   Once deployed, Wrangler will provide you with a URL (e.g., `https://expenshare-exe.<your-username>.workers.dev`). Visiting this URL in your browser will immediately start downloading the latest `.exe` release!

## Configuration
If you fork this project, be sure to update the `OWNER` and `REPO` constants at the top of the `src/index.js` files (for the GitHub-based workers) to point to your own GitHub repository.
