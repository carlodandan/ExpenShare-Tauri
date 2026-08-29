# ExpenShare Landing Website

A lightweight, static 1-page landing website for **ExpenShare** designed for zero-config deployment on **Cloudflare Pages**, GitHub Pages, or any static hosting provider.

## Deploying to Cloudflare Pages

1. In the **Cloudflare Dashboard**, navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Select the repository: `carlodandan/ExpenShare-Tauri`.
3. In the **Set up builds and deployments** section:
   - **Framework preset**: `None`
   - **Build command**: *(leave blank)*
   - **Build output directory**: `website`
   - **Root directory**: `/` (or leave default)
4. Click **Save and Deploy**.

Cloudflare Pages will serve `website/index.html` instantly with global CDN caching and SSL.
