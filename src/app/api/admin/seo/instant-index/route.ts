import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://movpix.xyz";

// Google Indexing API endpoint
const GOOGLE_INDEXING_API = "https://indexing.googleapis.com/v3/urlNotifications:publish";

interface IndexingResult {
  url: string;
  success: boolean;
  message: string;
}

// POST /api/admin/seo/instant-index - Submit URLs to Google for instant indexing
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { urls, type = "URL_UPDATED" } = body;

    // Validate type
    if (!["URL_UPDATED", "URL_DELETED"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid type. Use URL_UPDATED or URL_DELETED" },
        { status: 400 }
      );
    }

    // Get Google service account credentials from settings
    let credentials;
    try {
      const credentialsSetting = await prisma.siteSetting.findUnique({
        where: { key: "googleIndexingCredentials" },
      });

      if (!credentialsSetting?.value) {
        // Return instructions for setting up Google Indexing API
        return NextResponse.json({
          success: false,
          error: "Google Indexing API credentials not configured",
          instructions: {
            step1: "Go to Google Cloud Console and create a project",
            step2: "Enable the Indexing API",
            step3: "Create a service account with Indexing API access",
            step4: "Download the JSON key file",
            step5: "Add the service account email to Google Search Console as an owner",
            step6: "Paste the JSON key contents in Settings > Google Indexing Credentials",
          },
          alternativeMethod: {
            description: "You can also use Google Search Console URL Inspection tool",
            steps: [
              "1. Go to Google Search Console",
              "2. Select your property (movpix.xyz)",
              "3. Go to URL Inspection",
              "4. Enter the URL you want to index",
              "5. Click 'Request Indexing'",
            ],
          },
        });
      }

      credentials = JSON.parse(credentialsSetting.value);
    } catch {
      return NextResponse.json({
        success: false,
        error: "Invalid Google Indexing credentials format",
      }, { status: 400 });
    }

    // Generate JWT for Google API authentication
    const jwt = await generateGoogleJWT(credentials);

    if (!jwt) {
      return NextResponse.json({
        success: false,
        error: "Failed to generate authentication token",
      }, { status: 500 });
    }

    // Submit each URL
    const results: IndexingResult[] = [];

    for (const url of urls) {
      try {
        const fullUrl = url.startsWith("http") ? url : `${SITE_URL}${url}`;

        const response = await fetch(GOOGLE_INDEXING_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            url: fullUrl,
            type: type,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          results.push({
            url: fullUrl,
            success: true,
            message: `Submitted for ${type === "URL_UPDATED" ? "indexing" : "removal"}`,
          });

          // Log successful submission
          console.log(`✅ Indexed: ${fullUrl}`, data);
        } else {
          const errorData = await response.json();
          results.push({
            url: fullUrl,
            success: false,
            message: errorData.error?.message || `HTTP ${response.status}`,
          });
          console.log(`❌ Failed to index: ${fullUrl}`, errorData);
        }
      } catch (err) {
        results.push({
          url,
          success: false,
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Submitted ${successCount}/${urls.length} URLs for indexing`,
      results,
    });
  } catch (error) {
    console.error("Instant indexing error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit for indexing" },
      { status: 500 }
    );
  }
}

// GET /api/admin/seo/instant-index - Get all movie URLs for batch indexing
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all"; // all, recent, unindexed

    let whereClause: { status: string; isActive: boolean; createdAt?: { gte: Date } } = {
      status: "PUBLISHED",
      isActive: true,
    };

    if (filter === "recent") {
      // Last 7 days
      whereClause.createdAt = {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      };
    }

    const movies = await prisma.movie.findMany({
      where: whereClause,
      select: {
        slug: true,
        title: true,
        createdAt: true,
        seoIndexStatus: {
          select: {
            googleIndexed: true,
            lastSubmitted: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Filter unindexed if requested
    let filteredMovies = movies;
    if (filter === "unindexed") {
      filteredMovies = movies.filter(m => !m.seoIndexStatus?.googleIndexed);
    }

    const urls = filteredMovies.map(m => ({
      url: `${SITE_URL}/movie/${m.slug}`,
      title: m.title,
      createdAt: m.createdAt,
      indexed: m.seoIndexStatus?.googleIndexed || false,
    }));

    return NextResponse.json({
      success: true,
      count: urls.length,
      urls,
    });
  } catch (error) {
    console.error("Get URLs error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get URLs" },
      { status: 500 }
    );
  }
}

// Generate JWT token for Google API
async function generateGoogleJWT(credentials: {
  client_email: string;
  private_key: string;
}): Promise<string | null> {
  try {
    const header = {
      alg: "RS256",
      typ: "JWT",
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/indexing",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600, // 1 hour
    };

    // For server-side JWT signing, we need crypto
    // This is a simplified version - in production, use a proper JWT library
    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(header));
    const payloadB64 = btoa(JSON.stringify(payload));
    const signatureInput = `${headerB64}.${payloadB64}`;

    // Import private key and sign
    const privateKey = credentials.private_key.replace(/\\n/g, "\n");

    // Use SubtleCrypto for signing
    const keyData = privateKey
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\s/g, "");

    const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));

    const key = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      encoder.encode(signatureInput)
    );

    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const jwt = `${headerB64}.${payloadB64}.${signatureB64}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      return tokenData.access_token;
    }

    return null;
  } catch (error) {
    console.error("JWT generation error:", error);
    return null;
  }
}
