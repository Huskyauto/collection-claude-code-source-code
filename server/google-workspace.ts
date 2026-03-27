import { getSubscriptionAccessToken } from "./oauth-subscriptions";

const GOOGLE_API = "https://www.googleapis.com";
const PEOPLE_API = "https://people.googleapis.com/v1";

async function getGoogleToken(tenantId: number): Promise<string> {
  const token = await getSubscriptionAccessToken("google", tenantId);
  if (!token) throw new Error("Google account not connected. Go to Settings > General and click 'Connect Subscription' for Google.");
  return token;
}

async function gFetch(token: string, url: string, init?: RequestInit): Promise<any> {
  const resp = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google API ${resp.status}: ${text.slice(0, 500)}`);
  }
  if (resp.status === 204) return { success: true };
  return resp.json();
}

export async function gmailSearch(tenantId: number, query: string, maxResults = 10): Promise<any> {
  const token = await getGoogleToken(tenantId);
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) });
  const list = await gFetch(token, `${GOOGLE_API}/gmail/v1/users/me/messages?${params}`);
  if (!list.messages?.length) return { messages: [], total: 0 };

  const details = await Promise.all(
    list.messages.slice(0, maxResults).map(async (m: any) => {
      const msg = await gFetch(token, `${GOOGLE_API}/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`);
      const headers = msg.payload?.headers || [];
      const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
      return {
        id: msg.id,
        threadId: msg.threadId,
        snippet: msg.snippet,
        from: getHeader("From"),
        to: getHeader("To"),
        subject: getHeader("Subject"),
        date: getHeader("Date"),
        labels: msg.labelIds,
      };
    })
  );

  return { messages: details, total: list.resultSizeEstimate || details.length };
}

export async function gmailGetMessage(tenantId: number, messageId: string): Promise<any> {
  const token = await getGoogleToken(tenantId);
  const msg = await gFetch(token, `${GOOGLE_API}/gmail/v1/users/me/messages/${messageId}?format=full`);
  const headers = msg.payload?.headers || [];
  const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

  let body = "";
  function extractBody(part: any): string {
    if (part.body?.data) return Buffer.from(part.body.data, "base64url").toString("utf-8");
    if (part.parts) return part.parts.map(extractBody).join("\n");
    return "";
  }
  body = extractBody(msg.payload);

  return {
    id: msg.id,
    threadId: msg.threadId,
    from: getHeader("From"),
    to: getHeader("To"),
    subject: getHeader("Subject"),
    date: getHeader("Date"),
    body: body.slice(0, 10000),
    labels: msg.labelIds,
  };
}

export async function gmailSend(tenantId: number, to: string, subject: string, body: string, cc?: string, bcc?: string): Promise<any> {
  const token = await getGoogleToken(tenantId);

  let rawEmail = `To: ${to}\nSubject: ${subject}\nContent-Type: text/html; charset=utf-8\nMIME-Version: 1.0\n`;
  if (cc) rawEmail += `Cc: ${cc}\n`;
  if (bcc) rawEmail += `Bcc: ${bcc}\n`;
  rawEmail += `\n${body}`;

  const encoded = Buffer.from(rawEmail).toString("base64url");
  return gFetch(token, `${GOOGLE_API}/gmail/v1/users/me/messages/send`, {
    method: "POST",
    body: JSON.stringify({ raw: encoded }),
  });
}

export async function gmailModifyLabels(tenantId: number, messageId: string, addLabels?: string[], removeLabels?: string[]): Promise<any> {
  const token = await getGoogleToken(tenantId);
  return gFetch(token, `${GOOGLE_API}/gmail/v1/users/me/messages/${messageId}/modify`, {
    method: "POST",
    body: JSON.stringify({
      addLabelIds: addLabels || [],
      removeLabelIds: removeLabels || [],
    }),
  });
}

export async function calendarListEvents(tenantId: number, timeMin?: string, timeMax?: string, maxResults = 20, calendarId = "primary"): Promise<any> {
  const token = await getGoogleToken(tenantId);
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    singleEvents: "true",
    orderBy: "startTime",
  });
  if (timeMin) params.set("timeMin", timeMin);
  else params.set("timeMin", new Date().toISOString());
  if (timeMax) params.set("timeMax", timeMax);

  const data = await gFetch(token, `${GOOGLE_API}/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
  return {
    events: (data.items || []).map((e: any) => ({
      id: e.id,
      summary: e.summary,
      description: e.description,
      location: e.location,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      status: e.status,
      htmlLink: e.htmlLink,
      attendees: e.attendees?.map((a: any) => ({ email: a.email, responseStatus: a.responseStatus })),
    })),
    nextPageToken: data.nextPageToken,
  };
}

export async function calendarCreateEvent(
  tenantId: number,
  summary: string,
  start: string,
  end: string,
  options?: { description?: string; location?: string; attendees?: string[]; calendarId?: string }
): Promise<any> {
  const token = await getGoogleToken(tenantId);
  const calId = options?.calendarId || "primary";

  const isAllDay = !start.includes("T");
  const event: any = {
    summary,
    start: isAllDay ? { date: start } : { dateTime: start },
    end: isAllDay ? { date: end } : { dateTime: end },
  };
  if (options?.description) event.description = options.description;
  if (options?.location) event.location = options.location;
  if (options?.attendees?.length) event.attendees = options.attendees.map(email => ({ email }));

  const created = await gFetch(token, `${GOOGLE_API}/calendar/v3/calendars/${encodeURIComponent(calId)}/events?sendUpdates=all`, {
    method: "POST",
    body: JSON.stringify(event),
  });
  return { id: created.id, htmlLink: created.htmlLink, summary: created.summary, start: created.start, end: created.end };
}

export async function calendarDeleteEvent(tenantId: number, eventId: string, calendarId = "primary"): Promise<any> {
  const token = await getGoogleToken(tenantId);
  await gFetch(token, `${GOOGLE_API}/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?sendUpdates=all`, { method: "DELETE" });
  return { success: true, deleted: eventId };
}

export async function contactsList(tenantId: number, query?: string, maxResults = 20): Promise<any> {
  const token = await getGoogleToken(tenantId);
  const params = new URLSearchParams({
    pageSize: String(maxResults),
    personFields: "names,emailAddresses,phoneNumbers,organizations",
  });
  if (query) params.set("query", query);

  const endpoint = query
    ? `${PEOPLE_API}/people:searchContacts?${params}`
    : `${PEOPLE_API}/people/me/connections?${params}&sortOrder=LAST_MODIFIED_DESCENDING`;

  const data = await gFetch(token, endpoint);
  const results = query ? data.results?.map((r: any) => r.person) : data.connections;

  return {
    contacts: (results || []).map((p: any) => ({
      resourceName: p.resourceName,
      name: p.names?.[0]?.displayName,
      email: p.emailAddresses?.[0]?.value,
      phone: p.phoneNumbers?.[0]?.value,
      organization: p.organizations?.[0]?.name,
    })),
  };
}

export async function contactsCreate(tenantId: number, name: string, email?: string, phone?: string, organization?: string): Promise<any> {
  const token = await getGoogleToken(tenantId);
  const person: any = {
    names: [{ givenName: name.split(" ")[0], familyName: name.split(" ").slice(1).join(" ") || undefined }],
  };
  if (email) person.emailAddresses = [{ value: email }];
  if (phone) person.phoneNumbers = [{ value: phone }];
  if (organization) person.organizations = [{ name: organization }];

  const created = await gFetch(token, `${PEOPLE_API}/people:createContact`, {
    method: "POST",
    body: JSON.stringify(person),
  });
  return { resourceName: created.resourceName, name: created.names?.[0]?.displayName };
}

export async function sheetsGet(tenantId: number, spreadsheetId: string, range: string): Promise<any> {
  const token = await getGoogleToken(tenantId);
  const data = await gFetch(token, `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`);
  return { range: data.range, values: data.values || [], majorDimension: data.majorDimension };
}

export async function sheetsUpdate(tenantId: number, spreadsheetId: string, range: string, values: any[][], inputOption = "USER_ENTERED"): Promise<any> {
  const token = await getGoogleToken(tenantId);
  return gFetch(token, `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=${inputOption}`, {
    method: "PUT",
    body: JSON.stringify({ range, majorDimension: "ROWS", values }),
  });
}

export async function sheetsAppend(tenantId: number, spreadsheetId: string, range: string, values: any[][], inputOption = "USER_ENTERED"): Promise<any> {
  const token = await getGoogleToken(tenantId);
  return gFetch(token, `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=${inputOption}&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({ range, majorDimension: "ROWS", values }),
  });
}

export async function sheetsClear(tenantId: number, spreadsheetId: string, range: string): Promise<any> {
  const token = await getGoogleToken(tenantId);
  return gFetch(token, `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function sheetsMetadata(tenantId: number, spreadsheetId: string): Promise<any> {
  const token = await getGoogleToken(tenantId);
  const data = await gFetch(token, `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`);
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title,
    sheets: (data.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title,
      rowCount: s.properties?.gridProperties?.rowCount,
      columnCount: s.properties?.gridProperties?.columnCount,
    })),
  };
}

export async function docsGet(tenantId: number, documentId: string): Promise<any> {
  const token = await getGoogleToken(tenantId);
  const doc = await gFetch(token, `https://docs.googleapis.com/v1/documents/${documentId}`);

  let textContent = "";
  function extractText(elements: any[]) {
    for (const el of elements || []) {
      if (el.paragraph?.elements) {
        for (const pe of el.paragraph.elements) {
          if (pe.textRun?.content) textContent += pe.textRun.content;
        }
      }
      if (el.table) {
        for (const row of el.table.tableRows || []) {
          for (const cell of row.tableCells || []) {
            extractText(cell.content || []);
          }
        }
      }
    }
  }
  extractText(doc.body?.content || []);

  return {
    documentId: doc.documentId,
    title: doc.title,
    textContent: textContent.slice(0, 20000),
  };
}

export async function docsCreate(tenantId: number, title: string, content?: string): Promise<any> {
  const token = await getGoogleToken(tenantId);
  const doc = await gFetch(token, `https://docs.googleapis.com/v1/documents`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });

  if (content) {
    await gFetch(token, `https://docs.googleapis.com/v1/documents/${doc.documentId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: [{ insertText: { location: { index: 1 }, text: content } }],
      }),
    });
  }

  return { documentId: doc.documentId, title: doc.title };
}
