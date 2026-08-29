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

      // Find the APK.
      const apk = release.assets?.find(
        (asset) =>
          asset.name.toLowerCase().endsWith(".apk") &&
          asset.name.toLowerCase().includes("")
      );

      if (!apk) {
        return new Response(
          "No  APK found in the latest release",
          {
            status: 404,
          }
        );
      }

      // Download the APK from GitHub.
      //
      // GitHub's browser_download_url may redirect to the
      // actual GitHub asset storage URL.
      //
      // Cloudflare follows that redirect internally.
      const apkResponse = await fetch(apk.browser_download_url, {
        redirect: "follow",
      });

      if (!apkResponse.ok) {
        console.error(
          `GitHub asset returned ${apkResponse.status}`
        );

        return new Response("Unable to retrieve APK", {
          status: 502,
        });
      }

      const headers = new Headers(apkResponse.headers);

      // Make the response explicitly an APK download.
      headers.set("Content-Type", "application/x-apk");

      headers.set(
        "Content-Disposition",
        `attachment; filename="${apk.name}"`
      );

      // Return the actual APK response.
      //
      // Microsoft sees this response directly and does not see
      // GitHub's redirect.
      return new Response(
        request.method === "HEAD" ? null : apkResponse.body,
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