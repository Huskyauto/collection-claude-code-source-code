import { db } from "./db";
import { sql } from "drizzle-orm";

export interface SocialConnection {
  id: number;
  tenantId: number;
  platform: string;
  accountName: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  scopes: string;
  enabled: boolean;
  connectedAt: string;
}

export interface PublishResult {
  success: boolean;
  platform: string;
  postId?: string;
  postUrl?: string;
  error?: string;
}

const PLATFORM_CONFIGS: Record<string, {
  name: string;
  apiBase: string;
  oauthUrl: string;
  tokenUrl: string;
  requiredScopes: string[];
  maxImageSize: number;
  supportedImageTypes: string[];
  characterLimit: number;
}> = {
  x: {
    name: "X (Twitter)",
    apiBase: "https://api.twitter.com/2",
    oauthUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    requiredScopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    maxImageSize: 5 * 1024 * 1024,
    supportedImageTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
    characterLimit: 280,
  },
  linkedin: {
    name: "LinkedIn",
    apiBase: "https://api.linkedin.com/v2",
    oauthUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    requiredScopes: ["w_member_social", "r_liteprofile"],
    maxImageSize: 10 * 1024 * 1024,
    supportedImageTypes: ["image/png", "image/jpeg", "image/gif"],
    characterLimit: 3000,
  },
  instagram: {
    name: "Instagram",
    apiBase: "https://graph.instagram.com/v18.0",
    oauthUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    requiredScopes: ["instagram_basic", "instagram_content_publish"],
    maxImageSize: 8 * 1024 * 1024,
    supportedImageTypes: ["image/jpeg", "image/png"],
    characterLimit: 2200,
  },
  facebook: {
    name: "Facebook",
    apiBase: "https://graph.facebook.com/v18.0",
    oauthUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    requiredScopes: ["pages_manage_posts", "pages_read_engagement"],
    maxImageSize: 10 * 1024 * 1024,
    supportedImageTypes: ["image/png", "image/jpeg", "image/gif"],
    characterLimit: 63206,
  },
};

async function ensureSocialTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS social_connections (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      account_name TEXT NOT NULL DEFAULT '',
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      token_expires_at BIGINT,
      scopes TEXT NOT NULL DEFAULT '',
      enabled BOOLEAN NOT NULL DEFAULT true,
      connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id, platform)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS social_posts (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      image_drive_url TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      scheduled_for TIMESTAMPTZ,
      published_at TIMESTAMPTZ,
      platform_post_id TEXT,
      platform_post_url TEXT,
      engagement_data JSONB DEFAULT '{}',
      campaign TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

let tablesReady = false;
async function getTablesReady() {
  if (!tablesReady) {
    await ensureSocialTables();
    tablesReady = true;
  }
}

export async function getSocialConnections(tenantId: number): Promise<SocialConnection[]> {
  await getTablesReady();
  const result = await db.execute(sql`
    SELECT id, tenant_id, platform, account_name, access_token, refresh_token, 
           token_expires_at, scopes, enabled, connected_at
    FROM social_connections WHERE tenant_id = ${tenantId}
  `);
  return ((result as any).rows || []).map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    platform: r.platform,
    accountName: r.account_name,
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    tokenExpiresAt: r.token_expires_at ? Number(r.token_expires_at) : null,
    scopes: r.scopes,
    enabled: r.enabled,
    connectedAt: r.connected_at,
  }));
}

export async function connectSocialAccount(params: {
  tenantId: number;
  platform: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  accountName?: string;
  scopes?: string;
}): Promise<any> {
  await getTablesReady();
  const config = PLATFORM_CONFIGS[params.platform];
  if (!config) return { error: `Unsupported platform: ${params.platform}. Supported: ${Object.keys(PLATFORM_CONFIGS).join(", ")}` };

  const result = await db.execute(sql`
    INSERT INTO social_connections (tenant_id, platform, access_token, refresh_token, token_expires_at, account_name, scopes)
    VALUES (${params.tenantId}, ${params.platform}, ${params.accessToken}, ${params.refreshToken || null}, 
            ${params.tokenExpiresAt || null}, ${params.accountName || ""}, ${params.scopes || config.requiredScopes.join(",")})
    ON CONFLICT (tenant_id, platform) DO UPDATE SET
      access_token = EXCLUDED.access_token,
      refresh_token = COALESCE(EXCLUDED.refresh_token, social_connections.refresh_token),
      token_expires_at = EXCLUDED.token_expires_at,
      account_name = EXCLUDED.account_name,
      scopes = EXCLUDED.scopes,
      enabled = true,
      updated_at = NOW()
    RETURNING id, platform, account_name, enabled
  `);
  const row = (result as any).rows?.[0] || result;
  return { success: true, connection: row };
}

export async function disconnectSocialAccount(tenantId: number, platform: string): Promise<any> {
  await getTablesReady();
  await db.execute(sql`
    UPDATE social_connections SET enabled = false, updated_at = NOW()
    WHERE tenant_id = ${tenantId} AND platform = ${platform}
  `);
  return { success: true, platform, status: "disconnected" };
}

export async function publishToX(connection: SocialConnection, content: string, imageBase64?: string): Promise<PublishResult> {
  try {
    let mediaId: string | undefined;
    
    if (imageBase64) {
      const uploadRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${connection.accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `media_data=${encodeURIComponent(imageBase64)}`,
      });
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        mediaId = uploadData.media_id_string;
      }
    }

    const tweetBody: any = { text: content };
    if (mediaId) {
      tweetBody.media = { media_ids: [mediaId] };
    }

    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tweetBody),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, platform: "x", error: `X API error ${res.status}: ${JSON.stringify(err)}` };
    }

    const data = await res.json();
    return {
      success: true,
      platform: "x",
      postId: data.data?.id,
      postUrl: `https://x.com/i/status/${data.data?.id}`,
    };
  } catch (err: any) {
    return { success: false, platform: "x", error: err.message };
  }
}

export async function publishToLinkedIn(connection: SocialConnection, content: string, imageBase64?: string): Promise<PublishResult> {
  try {
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { "Authorization": `Bearer ${connection.accessToken}` },
    });
    if (!profileRes.ok) {
      return { success: false, platform: "linkedin", error: `LinkedIn profile fetch failed: ${profileRes.status}` };
    }
    const profile = await profileRes.json();
    const authorUrn = `urn:li:person:${profile.sub}`;

    let imageUrn: string | undefined;
    if (imageBase64) {
      const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${connection.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
            owner: authorUrn,
            serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
          },
        }),
      });
      
      if (registerRes.ok) {
        const registerData = await registerRes.json();
        const uploadUrl = registerData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
        imageUrn = registerData.value?.asset;

        if (uploadUrl && imageUrn) {
          const imgBuffer = Buffer.from(imageBase64, "base64");
          await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${connection.accessToken}`,
              "Content-Type": "image/png",
            },
            body: imgBuffer,
          });
        }
      }
    }

    const postBody: any = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: content },
          shareMediaCategory: imageUrn ? "IMAGE" : "NONE",
          ...(imageUrn ? {
            media: [{
              status: "READY",
              media: imageUrn,
            }],
          } : {}),
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };

    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postBody),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, platform: "linkedin", error: `LinkedIn API error ${res.status}: ${JSON.stringify(err)}` };
    }

    const data = await res.json();
    return {
      success: true,
      platform: "linkedin",
      postId: data.id,
      postUrl: `https://www.linkedin.com/feed/update/${data.id}`,
    };
  } catch (err: any) {
    return { success: false, platform: "linkedin", error: err.message };
  }
}

export async function publishToInstagram(connection: SocialConnection, content: string, imageUrl?: string): Promise<PublishResult> {
  try {
    if (!imageUrl) {
      return { success: false, platform: "instagram", error: "Instagram requires an image URL (must be publicly accessible HTTPS)" };
    }

    const createRes = await fetch(`https://graph.instagram.com/v18.0/me/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: content,
        access_token: connection.accessToken,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      return { success: false, platform: "instagram", error: `Instagram container error ${createRes.status}: ${JSON.stringify(err)}` };
    }

    const container = await createRes.json();

    const publishRes = await fetch(`https://graph.instagram.com/v18.0/me/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: connection.accessToken,
      }),
    });

    if (!publishRes.ok) {
      const err = await publishRes.json().catch(() => ({}));
      return { success: false, platform: "instagram", error: `Instagram publish error ${publishRes.status}: ${JSON.stringify(err)}` };
    }

    const published = await publishRes.json();
    return {
      success: true,
      platform: "instagram",
      postId: published.id,
      postUrl: `https://www.instagram.com/p/${published.id}`,
    };
  } catch (err: any) {
    return { success: false, platform: "instagram", error: err.message };
  }
}

export async function publishPost(params: {
  tenantId: number;
  platform: string;
  content: string;
  imageBase64?: string;
  imageUrl?: string;
  campaign?: string;
}): Promise<PublishResult> {
  await getTablesReady();
  
  const connections = await getSocialConnections(params.tenantId);
  const connection = connections.find(c => c.platform === params.platform && c.enabled);

  if (!connection) {
    return {
      success: false,
      platform: params.platform,
      error: `No connected ${PLATFORM_CONFIGS[params.platform]?.name || params.platform} account found. Connect your account first via Settings → Social Media.`,
    };
  }

  let result: PublishResult;

  switch (params.platform) {
    case "x":
      result = await publishToX(connection, params.content, params.imageBase64);
      break;
    case "linkedin":
      result = await publishToLinkedIn(connection, params.content, params.imageBase64);
      break;
    case "instagram":
      result = await publishToInstagram(connection, params.content, params.imageUrl);
      break;
    default:
      result = { success: false, platform: params.platform, error: `Publishing not yet supported for ${params.platform}` };
  }

  await db.execute(sql`
    INSERT INTO social_posts (tenant_id, platform, content, image_url, image_drive_url, status, 
                              platform_post_id, platform_post_url, campaign, published_at)
    VALUES (${params.tenantId}, ${params.platform}, ${params.content}, ${params.imageBase64 ? "base64_image" : null},
            ${params.imageUrl || null}, ${result.success ? "published" : "failed"},
            ${result.postId || null}, ${result.postUrl || null}, ${params.campaign || null},
            ${result.success ? sql`NOW()` : null})
  `);

  return result;
}

export async function saveDraftPost(params: {
  tenantId: number;
  platform: string;
  content: string;
  imageDriveUrl?: string;
  campaign?: string;
  scheduledFor?: string;
}): Promise<any> {
  await getTablesReady();
  const result = await db.execute(sql`
    INSERT INTO social_posts (tenant_id, platform, content, image_drive_url, status, scheduled_for, campaign)
    VALUES (${params.tenantId}, ${params.platform}, ${params.content}, ${params.imageDriveUrl || null},
            ${params.scheduledFor ? "scheduled" : "draft"}, ${params.scheduledFor || null}, ${params.campaign || null})
    RETURNING id, platform, content, status, scheduled_for, campaign
  `);
  return { success: true, post: (result as any).rows?.[0] || result };
}

export async function listPosts(params: {
  tenantId: number;
  status?: string;
  platform?: string;
  limit?: number;
}): Promise<any> {
  await getTablesReady();
  const limit = params.limit || 20;
  let result;
  if (params.status && params.platform) {
    result = await db.execute(sql`
      SELECT * FROM social_posts WHERE tenant_id = ${params.tenantId} AND status = ${params.status} AND platform = ${params.platform}
      ORDER BY created_at DESC LIMIT ${limit}
    `);
  } else if (params.status) {
    result = await db.execute(sql`
      SELECT * FROM social_posts WHERE tenant_id = ${params.tenantId} AND status = ${params.status}
      ORDER BY created_at DESC LIMIT ${limit}
    `);
  } else if (params.platform) {
    result = await db.execute(sql`
      SELECT * FROM social_posts WHERE tenant_id = ${params.tenantId} AND platform = ${params.platform}
      ORDER BY created_at DESC LIMIT ${limit}
    `);
  } else {
    result = await db.execute(sql`
      SELECT * FROM social_posts WHERE tenant_id = ${params.tenantId}
      ORDER BY created_at DESC LIMIT ${limit}
    `);
  }
  return { posts: (result as any).rows || [] };
}

export function getPlatformConfigs() {
  return Object.entries(PLATFORM_CONFIGS).map(([key, config]) => ({
    platform: key,
    name: config.name,
    characterLimit: config.characterLimit,
    requiredScopes: config.requiredScopes,
    maxImageSize: config.maxImageSize,
  }));
}
