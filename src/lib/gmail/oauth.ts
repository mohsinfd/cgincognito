/**
 * Gmail OAuth utilities
 * Based on PRD Section F
 */

import { google } from 'googleapis';
import type { GmailTokenResponse, GoogleIdToken } from '@/types/gmail';
import { REQUIRED_SCOPES, OPTIONAL_SCOPES } from '@/types/gmail';

/**
 * Create OAuth2 client
 */
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate authorization URL
 * @param includeModifyScope Include gmail.modify scope for labeling
 */
export function generateAuthUrl(includeModifyScope: boolean = true): string {
  const oauth2Client = createOAuth2Client();

  const scopes = includeModifyScope
    ? [...REQUIRED_SCOPES, ...OPTIONAL_SCOPES]
    : REQUIRED_SCOPES;

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GmailTokenResponse> {
  const oauth2Client = createOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to obtain access token or refresh token');
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    scope: tokens.scope || '',
    token_type: tokens.token_type || 'Bearer',
    expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000,
    id_token: tokens.id_token,
  };
}

/**
 * Decode Google ID token to get user info
 */
export async function decodeIdToken(idToken: string): Promise<GoogleIdToken> {
  const oauth2Client = createOAuth2Client();

  const ticket = await oauth2Client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload || !payload.sub || !payload.email) {
    throw new Error('Invalid ID token payload');
  }

  return {
    sub: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified || false,
    name: payload.name,
    picture: payload.picture,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token');
  }

  return credentials.access_token;
}

/**
 * Revoke OAuth token
 */
export async function revokeToken(token: string): Promise<void> {
  const oauth2Client = createOAuth2Client();
  await oauth2Client.revokeToken(token);
}

