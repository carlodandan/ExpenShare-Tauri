const OWNER = "carlodandan";
const REPO = "ExpenShare-Tauri";

const GITHUB_API = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;

export default {
  async fetch(request, env, ctx) {
    // Only allow GET and HEAD requests.
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: {
          Allow: "GET, HEAD",
        },
      });
    }

    try {
      // Ask GitHub for the latest stable release.
      const releaseResponse = await fetch(GITHUB_API, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "ExpenShare-Download-Worker",
        },
      });

      if (!releaseResponse.ok) {
        console.error(
          `GitHub API returned ${releaseResponse.status}`
        );

        return new Response("Unable to retrieve latest release", {
          status: 502,
        });
      }

      const release = await releaseResponse.json();

      // Find the x64 MSI.
      const msi = release.assets?.find(
        (asset) =>
          asset.name.toLowerCase().endsWith(".msi") &&
          asset.name.toLowerCase().includes("x64")
      );

      if (!msi) {
        return new Response(
          "No x64 MSI found in the latest release",
          {
            status: 404,
          }
        );
      }

      // Download the MSI from GitHub.
      //
      // GitHub's browser_download_url may redirect to the
      // actual GitHub asset storage URL.
      //
      // Cloudflare follows that redirect internally.
      const msiResponse = await fetch(msi.browser_download_url, {
        redirect: "follow",
      });

      if (!msiResponse.ok) {
        console.error(
          `GitHub asset returned ${msiResponse.status}`
        );

        return new Response("Unable to retrieve MSI", {
          status: 502,
        });
      }

      const headers = new Headers(msiResponse.headers);

      // Make the response explicitly an MSI download.
      headers.set("Content-Type", "application/x-msi");

      headers.set(
        "Content-Disposition",
        `attachment; filename="${msi.name}"`
      );

      // Return the actual MSI response.
      //
      // Microsoft sees this response directly and does not see
      // GitHub's redirect.
      return new Response(
        request.method === "HEAD" ? null : msiResponse.body,
        {
          status: 200,
          headers,
        }
      );
    } catch (error) {
      console.error(error);

      return new Response("Download service error", {
        status: 500,
      });
    }
  },
};