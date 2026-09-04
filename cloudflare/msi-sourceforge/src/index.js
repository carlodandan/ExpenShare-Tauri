const SOURCEFORGE_LATEST_URL =
  "https://sourceforge.net/projects/expenshare-tauri/files/latest/download";

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
      const url = new URL(request.url);
      const versionParam = url.searchParams.get("version") || url.searchParams.get("v");

      // Use specific version if requested, otherwise fetch latest automatically
      let targetUrl = SOURCEFORGE_LATEST_URL;
      if (versionParam) {
        const cleanVersion = versionParam.replace(/^v/, "").trim();
        targetUrl = `https://sourceforge.net/projects/expenshare-tauri/files/release/${cleanVersion}/ExpenShare_${cleanVersion}_x64_en-US.msi/download`;
      }

      // Download the MSI from SourceForge.
      //
      // SourceForge redirects (302) to its mirror network (e.g., downloads.sourceforge.net).
      // Cloudflare follows those redirects internally so the client/caller receives a direct 200 OK.
      const response = await fetch(targetUrl, {
        redirect: "follow",
        headers: {
          "User-Agent": "ExpenShare-Download-Worker",
        },
      });

      if (!response.ok) {
        console.error(
          `SourceForge download returned status: ${response.status} for URL: ${targetUrl}`
        );

        return new Response("Unable to retrieve MSI from SourceForge", {
          status: 502,
        });
      }

      const headers = new Headers(response.headers);

      // Explicitly ensure MSI content type
      headers.set("Content-Type", "application/x-msi");

      // SourceForge mirror provides the exact filename in Content-Disposition.
      // If missing for any reason, provide a fallback.
      if (!headers.has("Content-Disposition")) {
        headers.set(
          "Content-Disposition",
          'attachment; filename="ExpenShare_x64_en-US.msi"'
        );
      }

      // Return the direct MSI response with 200 OK.
      return new Response(
        request.method === "HEAD" ? null : response.body,
        {
          status: 200,
          headers,
        }
      );
    } catch (error) {
      console.error("Worker error:", error);

      return new Response("Download service error", {
        status: 500,
      });
    }
  },
};
