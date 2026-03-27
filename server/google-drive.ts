import fs from "fs";
import path from "path";
import { db } from "./db";
import { providerKeys } from "@shared/schema";
import { eq } from "drizzle-orm";

const VISIONCLAW_FOLDER_ID = "1ee71jK75Rz52Tc0Yy5zm5s562S3dZLY7";
const VISIONCLAW_FOLDER_NAME = "VisionClaw Agent";
const DRIVE_API = "https://www.googleapis.com";
const GDRIVE_PROVIDER_KEY = "google_drive_token";

let _cachedToken: string | null = null;
let _tokenExpiry: number = 0;
let _refreshInterval: ReturnType<typeof setInterval> | null = null;
const TOKEN_REFRESH_INTERVAL_MS = 45 * 60 * 1000;

export async function setDriveToken(token: string, expiresInMs?: number) {
  _cachedToken = token;
  _tokenExpiry = Date.now() + (expiresInMs || 3500000);
  try {
    const existing = await db.select({ id: providerKeys.id }).from(providerKeys).where(eq(providerKeys.provider, GDRIVE_PROVIDER_KEY)).limit(1);
    if (existing.length > 0) {
      await db.update(providerKeys).set({ apiKey: token, enabled: true }).where(eq(providerKeys.provider, GDRIVE_PROVIDER_KEY));
    } else {
      await db.insert(providerKeys).values({ provider: GDRIVE_PROVIDER_KEY, apiKey: token, enabled: true });
    }
    console.log("[gdrive] Token saved to database, expires in", Math.round((_tokenExpiry - Date.now()) / 1000), "seconds");
  } catch (err: any) {
    console.error("[gdrive] Failed to save token to DB:", err.message);
  }
}

async function tryConnectorRefresh(): Promise<string | null> {
  try {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    if (!hostname) {
      console.log("[gdrive] No REPLIT_CONNECTORS_HOSTNAME — connector unavailable");
      return null;
    }

    const replIdentity = process.env.REPL_IDENTITY;
    const webReplRenewal = process.env.WEB_REPL_RENEWAL;
    const xReplitToken = replIdentity
      ? 'repl ' + replIdentity
      : webReplRenewal
        ? 'depl ' + webReplRenewal
        : null;

    if (!xReplitToken) {
      console.log("[gdrive] No REPL_IDENTITY or WEB_REPL_RENEWAL — connector auth unavailable");
      return null;
    }

    const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
    const envOrder = isProduction ? ['production', 'development'] : ['development', 'production'];

    let conn: any = null;
    for (const env of envOrder) {
      const url = new URL(`https://${hostname}/api/v2/connection`);
      url.searchParams.set('include_secrets', 'true');
      url.searchParams.set('connector_names', 'google-drive');
      url.searchParams.set('environment', env);

      console.log("[gdrive] Fetching token from connector API (env:", env, ")...");
      const resp = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json', 'X-Replit-Token': xReplitToken },
      });

      if (!resp.ok) {
        console.log("[gdrive] Connector API returned", resp.status, resp.statusText, "for env:", env);
        continue;
      }

      const data = await resp.json();
      if (data?.items?.[0]) {
        conn = data.items[0];
        console.log("[gdrive] Found connection in", env, "environment");
        break;
      }
    }

    if (!conn) {
      console.log("[gdrive] No google-drive connection found in connector API");
      return null;
    }

    const token = conn?.settings?.oauth?.credentials?.access_token;
    const expiryStr = conn?.settings?.oauth?.credentials?.expiry_date;
    const expiryMs = expiryStr ? new Date(expiryStr).getTime() - Date.now() : 3500000;

    if (token && typeof token === 'string' && token.length > 20) {
      console.log("[gdrive] Got fresh token via connector (length:", token.length, ", expires in:", Math.round(expiryMs / 1000), "s)");
      await setDriveToken(token, expiryMs > 0 ? expiryMs : 3500000);
      return token;
    }

    console.log("[gdrive] Connector returned connection but no valid access_token");
    return null;
  } catch (err: any) {
    console.log("[gdrive] Connector refresh error:", err.message?.substring(0, 120));
    return null;
  }
}

export async function forceTokenRefresh(): Promise<boolean> {
  _cachedToken = null;
  _tokenExpiry = 0;

  const connectorToken = await tryConnectorRefresh();
  if (connectorToken) return true;

  try {
    const rows = await db.select().from(providerKeys).where(eq(providerKeys.provider, GDRIVE_PROVIDER_KEY)).limit(1);
    if (rows.length > 0 && rows[0].apiKey && rows[0].enabled) {
      _cachedToken = rows[0].apiKey;
      _tokenExpiry = Date.now() + 3500000;
      console.log("[gdrive] Force-refreshed from database");
      return true;
    }
  } catch {}

  const envToken = process.env.GOOGLE_DRIVE_TOKEN;
  if (envToken) {
    await setDriveToken(envToken);
    console.log("[gdrive] Force-refreshed from env var (fallback)");
    return true;
  }

  return false;
}

async function getAccessToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiry - 30000) {
    return _cachedToken;
  }

  const connectorToken = await tryConnectorRefresh();
  if (connectorToken) return connectorToken;

  console.log("[gdrive] Loading token from database...");
  try {
    const rows = await db.select().from(providerKeys).where(eq(providerKeys.provider, GDRIVE_PROVIDER_KEY)).limit(1);
    if (rows.length > 0 && rows[0].apiKey && rows[0].enabled) {
      _cachedToken = rows[0].apiKey;
      _tokenExpiry = Date.now() + 3500000;
      console.log("[gdrive] Token loaded from database (length:", rows[0].apiKey.length, ")");
      return rows[0].apiKey;
    }
  } catch (dbErr: any) {
    console.error("[gdrive] DB token load failed:", dbErr.message);
  }

  const envToken = process.env.GOOGLE_DRIVE_TOKEN;
  if (envToken) {
    _cachedToken = envToken;
    _tokenExpiry = Date.now() + 3500000;
    console.log("[gdrive] Token loaded from env var (fallback)");
    return envToken;
  }

  throw new Error("No Google Drive access token available. Use the refresh_gdrive_token tool or POST /api/gdrive/refresh-token to set one.");
}

export async function driveRequest(endpoint: string, options?: { method?: string; headers?: Record<string, string>; body?: string | Buffer }, _retried = false): Promise<Response> {
  const token = await getAccessToken();
  const url = endpoint.startsWith("http") ? endpoint : `${DRIVE_API}${endpoint}`;

  const resp = await fetch(url, {
    method: options?.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
    body: options?.body,
  });

  if (resp.status === 401 && !_retried) {
    console.log("[gdrive] 401 — attempting auto-refresh...");
    const refreshed = await forceTokenRefresh();
    if (refreshed) {
      console.log("[gdrive] Token refreshed, retrying request...");
      return driveRequest(endpoint, options, true);
    }
    throw new Error("Google Drive token expired and auto-refresh failed. Reconnect the Google Drive integration or POST /api/gdrive/refresh-token with a new token.");
  }

  if (resp.status === 401) {
    throw new Error("Google Drive token expired. Auto-refresh already attempted. Needs manual token.");
  }

  return resp;
}

export async function driveJson(endpoint: string, options?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<any> {
  const resp = await driveRequest(endpoint, options);
  return resp.json();
}

function getVisionClawFolderId(): string {
  return VISIONCLAW_FOLDER_ID;
}

export async function makeFileShareable(fileId: string): Promise<{ success: boolean; webViewLink?: string; directDownloadLink?: string; error?: string }> {
  try {
    const permResult = await driveJson(`/drive/v3/files/${fileId}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    });
    console.log("[gdrive] Permission set for", fileId, "result:", JSON.stringify(permResult).substring(0, 100));

    const webViewLink = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    const directDownloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;

    return { success: true, webViewLink, directDownloadLink };
  } catch (err: any) {
    console.error("[gdrive] makeFileShareable error:", err.message);
    return { success: false, error: err.message };
  }
}

async function findOrCreateFolder(parentFolderId: string, folderName: string): Promise<{ id: string; webViewLink: string }> {
  const q = `name='${folderName.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchResult = await driveJson(`/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink)&pageSize=1`);
  if (searchResult.files && searchResult.files.length > 0) {
    return { id: searchResult.files[0].id, webViewLink: searchResult.files[0].webViewLink || `https://drive.google.com/drive/folders/${searchResult.files[0].id}` };
  }
  return createSubfolder(parentFolderId, folderName);
}

async function findOrCreateNestedFolder(rootFolderId: string, pathParts: string[]): Promise<{ id: string; webViewLink: string }> {
  let currentParent = rootFolderId;
  let result = { id: rootFolderId, webViewLink: "" };
  for (const part of pathParts) {
    result = await findOrCreateFolder(currentParent, part);
    currentParent = result.id;
  }
  return result;
}

async function createSubfolder(parentFolderId: string, folderName: string): Promise<{ id: string; webViewLink: string }> {
  const createResult = await driveJson("/drive/v3/files?fields=id,name,webViewLink", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    }),
  });

  if (!createResult.id) {
    throw new Error("Failed to create subfolder: " + JSON.stringify(createResult));
  }

  await driveJson(`/drive/v3/files/${createResult.id}/permissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

  const webViewLink = `https://drive.google.com/drive/folders/${createResult.id}?usp=sharing`;
  console.log(`[gdrive] Created shareable subfolder: ${folderName} (${createResult.id})`);

  return { id: createResult.id, webViewLink };
}

export async function uploadToDrive(params: {
  filePath?: string;
  fileData?: Buffer;
  fileName: string;
  mimeType: string;
  description?: string;
  share?: boolean;
  customerName?: string;
  folderLabel?: string;
}): Promise<{ success: boolean; fileId?: string; webViewLink?: string; webContentLink?: string; shareableLink?: string; directDownloadLink?: string; customerFolderId?: string; customerFolderLink?: string; error?: string }> {
  try {
    const rootFolderId = getVisionClawFolderId();

    let fileBuffer: Buffer;
    if (params.fileData) {
      fileBuffer = params.fileData;
    } else if (params.filePath) {
      const resolved = path.resolve(process.cwd(), params.filePath);
      if (!fs.existsSync(resolved)) {
        return { success: false, error: `File not found: ${params.filePath}` };
      }
      fileBuffer = fs.readFileSync(resolved);
    } else {
      return { success: false, error: "Either filePath or fileData is required" };
    }

    const label = params.folderLabel || params.customerName || params.fileName.replace(/\.[^.]+$/, "");
    let subfolder: { id: string; webViewLink: string };

    if (label.includes("/")) {
      const pathParts = label.split("/").filter(Boolean);
      subfolder = await findOrCreateNestedFolder(rootFolderId, pathParts);
    } else {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
      const subfolderName = `${dateStr}_${timeStr}_${label}`;
      subfolder = await createSubfolder(rootFolderId, subfolderName);
    }

    const metadata = {
      name: params.fileName,
      parents: [subfolder.id],
      description: params.description || `Uploaded by VisionClaw on ${new Date().toISOString().split("T")[0]}`,
    };

    const boundary = "visionclaw_boundary_" + Date.now();
    const delimiter = `--${boundary}`;
    const closeDelimiter = `--${boundary}--`;

    const metaPart = `${delimiter}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const mediaPart = `${delimiter}\r\nContent-Type: ${params.mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${fileBuffer.toString("base64")}\r\n${closeDelimiter}`;

    const body = metaPart + mediaPart;

    const token = await getAccessToken();
    const response = await fetch(`${DRIVE_API}/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    const result = await response.json() as any;

    if (result.error) {
      if (result.error.code === 401) {
        _cachedToken = null;
        _tokenExpiry = 0;
        return { success: false, error: "Google Drive token expired. Please refresh the token." };
      }
      return { success: false, error: result.error.message || JSON.stringify(result.error) };
    }

    let shareableLink = `https://drive.google.com/file/d/${result.id}/view?usp=sharing`;
    let directDownloadLink = `https://drive.google.com/uc?export=download&id=${result.id}`;

    if (result.id && params.share !== false) {
      const shareResult = await makeFileShareable(result.id);
      if (!shareResult.success) {
        console.warn("[gdrive] Share permission failed (file still uploaded):", shareResult.error);
      }
    }

    console.log("[gdrive] Upload complete. File:", result.id, "Folder:", subfolder.id);

    return {
      success: true,
      fileId: result.id,
      webViewLink: shareableLink,
      webContentLink: directDownloadLink,
      shareableLink,
      directDownloadLink,
      customerFolderId: subfolder.id,
      customerFolderLink: subfolder.webViewLink,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function listDriveFiles(params?: {
  query?: string;
  pageSize?: number;
  folderId?: string;
}): Promise<{ success: boolean; files?: any[]; error?: string }> {
  try {
    const folderId = params?.folderId || getVisionClawFolderId();
    const pageSize = params?.pageSize || 50;

    let q = `'${folderId}' in parents and trashed=false`;
    if (params?.query) {
      q += ` and name contains '${params.query.replace(/'/g, "\\'")}'`;
    }

    const url = `/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=${pageSize}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink)&orderBy=modifiedTime desc`;
    const result = await driveJson(url);

    return {
      success: true,
      files: result.files || [],
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function downloadFromDrive(params: {
  fileId: string;
  savePath?: string;
}): Promise<{ success: boolean; path?: string; size?: number; error?: string }> {
  try {
    const metaResult = await driveJson(`/drive/v3/files/${params.fileId}?fields=id,name,mimeType,size`);
    if (metaResult.error) {
      return { success: false, error: metaResult.error.message || JSON.stringify(metaResult.error) };
    }

    const response = await driveRequest(`/drive/v3/files/${params.fileId}?alt=media`);
    const arrayBuf = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const uploadsDir = path.resolve(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const savePath = params.savePath || `uploads/${metaResult.name || `drive_${params.fileId}`}`;
    const resolved = path.resolve(process.cwd(), savePath);
    fs.writeFileSync(resolved, buffer);

    return {
      success: true,
      path: savePath,
      size: buffer.length,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteDriveFile(fileId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await driveRequest(`/drive/v3/files/${fileId}`, { method: "DELETE" });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export interface ShareableLinkResult {
  success: boolean;
  fileId?: string;
  viewUrl?: string;
  downloadUrl?: string;
  imageUrl?: string;
  folderUrl?: string;
  error?: string;
}

export async function uploadAndShare(params: {
  filePath?: string;
  fileData?: Buffer;
  fileName: string;
  mimeType?: string;
  description?: string;
  customerName?: string;
  folderLabel?: string;
  share?: boolean;
}): Promise<ShareableLinkResult> {
  const ext = path.extname(params.fileName).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
    ".pdf": "application/pdf", ".csv": "text/csv",
    ".json": "application/json", ".txt": "text/plain",
    ".html": "text/html", ".mp3": "audio/mpeg", ".wav": "audio/wav",
    ".mp4": "video/mp4", ".zip": "application/zip",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  const mimeType = params.mimeType || mimeMap[ext] || "application/octet-stream";

  const result = await uploadToDrive({
    filePath: params.filePath,
    fileData: params.fileData,
    fileName: params.fileName,
    mimeType,
    description: params.description,
    share: params.share !== false,
    customerName: params.customerName,
    folderLabel: params.folderLabel || "deliverables",
  });

  if (!result.success || !result.fileId) {
    return { success: false, error: result.error || "Upload failed" };
  }

  const isImage = mimeType.startsWith("image/");

  return {
    success: true,
    fileId: result.fileId,
    viewUrl: result.shareableLink,
    downloadUrl: result.directDownloadLink,
    imageUrl: isImage ? `https://lh3.googleusercontent.com/d/${result.fileId}` : undefined,
    folderUrl: result.customerFolderLink,
  };
}

export async function getDriveFolderInfo(): Promise<{ success: boolean; folderId?: string; folderName?: string; fileCount?: number; error?: string }> {
  try {
    const folderId = getVisionClawFolderId();
    const listing = await listDriveFiles({ folderId });
    return {
      success: true,
      folderId,
      folderName: VISIONCLAW_FOLDER_NAME,
      fileCount: listing.files?.length || 0,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function startDriveTokenRefreshLoop() {
  if (_refreshInterval) return;
  _refreshInterval = setInterval(async () => {
    try {
      const timeUntilExpiry = _tokenExpiry - Date.now();
      if (timeUntilExpiry < 10 * 60 * 1000) {
        console.log("[gdrive] Proactive token refresh (expires in", Math.round(timeUntilExpiry / 1000), "s)");
        const token = await tryConnectorRefresh();
        if (token) {
          console.log("[gdrive] Proactive refresh successful");
        } else {
          console.warn("[gdrive] Proactive refresh failed — connector returned no token");
        }
      }
    } catch (err: any) {
      console.warn("[gdrive] Proactive refresh error:", err.message?.substring(0, 100));
    }
  }, TOKEN_REFRESH_INTERVAL_MS);
  console.log("[gdrive] Token refresh loop started (every 45 min)");
}

export function stopDriveTokenRefreshLoop() {
  if (_refreshInterval) {
    clearInterval(_refreshInterval);
    _refreshInterval = null;
  }
}

export function isDriveTokenValid(): boolean {
  return !!_cachedToken && Date.now() < _tokenExpiry - 30000;
}
