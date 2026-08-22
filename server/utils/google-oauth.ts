const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

function clientId(): string {
  const id = process.env.AUTH_GOOGLE_ID;
  if (!id) throw new Error("AUTH_GOOGLE_ID is not set");
  return id;
}

function clientSecret(): string {
  const secret = process.env.AUTH_GOOGLE_SECRET;
  if (!secret) throw new Error("AUTH_GOOGLE_SECRET is not set");
  return secret;
}

/** Build the Google OAuth2 authorization URL for the authorization-code flow. */
export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

/** Exchange an authorization code for an access token. */
export async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; id_token?: string }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });

  const data = (await res.json()) as {
    access_token?: string;
    id_token?: string;
    error?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(data.error || "Google token exchange failed");
  }

  return { access_token: data.access_token, id_token: data.id_token };
}

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

/** Fetch the authenticated user's Google profile. */
export async function getGoogleUserInfo(
  accessToken: string,
): Promise<GoogleProfile> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch Google profile");
  return (await res.json()) as GoogleProfile;
}
