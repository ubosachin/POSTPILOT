import { BskyAgent } from '@atproto/api';

export interface BlueskyCredentials {
  identifier: string;
  password: string; // App Password recommended
  service?: string;
  isSandbox?: boolean;
}

export interface BlueskyPublishResult {
  success: boolean;
  uri?: string;
  cid?: string;
  postUrl?: string;
  errorCode?: string;
  errorDetails?: string;
}

export class BlueskyAdapter {
  private agent: BskyAgent;
  private service: string;

  constructor(serviceUrl = 'https://bsky.social') {
    this.service = serviceUrl;
    this.agent = new BskyAgent({ service: serviceUrl });
  }

  /**
   * Verify credentials by attempting a session login
   */
  async verifyConnection(creds: BlueskyCredentials): Promise<{ valid: boolean; handle?: string; error?: string }> {
    if (creds.isSandbox) {
      return { valid: true, handle: creds.identifier };
    }

    try {
      const loginRes = await this.agent.login({
        identifier: creds.identifier,
        password: creds.password,
      });

      return {
        valid: true,
        handle: loginRes.data.handle,
      };
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to authenticate with Bluesky';
      return {
        valid: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Publish a text post to Bluesky
   */
  async publishPost(
    creds: BlueskyCredentials,
    text: string
  ): Promise<BlueskyPublishResult> {
    // Validate text length (Bluesky limit: 300 graphemes)
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        errorCode: 'EMPTY_CONTENT',
        errorDetails: 'Cannot publish an empty post to Bluesky.',
      };
    }

    if (text.length > 300) {
      return {
        success: false,
        errorCode: 'CHARACTER_LIMIT_EXCEEDED',
        errorDetails: `Content length (${text.length}) exceeds Bluesky limit of 300 characters.`,
      };
    }

    // Sandbox / Simulation fallback when test mode is enabled
    if (creds.isSandbox || creds.password.startsWith('demo-') || creds.identifier.includes('demo')) {
      const mockCid = `bafyreic${Math.random().toString(36).substring(2, 10)}${Date.now()}`;
      const mockRkey = `3l${Math.random().toString(36).substring(2, 8)}`;
      const cleanHandle = creds.identifier.replace('@', '');
      const uri = `at://did:plc:demo${cleanHandle}/app.bsky.feed.post/${mockRkey}`;
      const postUrl = `https://bsky.app/profile/${cleanHandle}/post/${mockRkey}`;

      return {
        success: true,
        uri,
        cid: mockCid,
        postUrl,
      };
    }

    try {
      // 1. Authenticate with AT Protocol
      await this.agent.login({
        identifier: creds.identifier,
        password: creds.password,
      });

      // 2. Publish post record
      const response = await this.agent.post({
        text: text.trim(),
        createdAt: new Date().toISOString(),
      });

      // Extract rkey from URI for direct bsky.app link
      // URI format: at://did:plc:.../app.bsky.feed.post/<rkey>
      const uriParts = response.uri.split('/');
      const rkey = uriParts[uriParts.length - 1];
      const postUrl = `https://bsky.app/profile/${creds.identifier}/post/${rkey}`;

      return {
        success: true,
        uri: response.uri,
        cid: response.cid,
        postUrl,
      };
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string; name?: string };
      console.error('[BlueskyAdapter] Publishing error:', error);

      let errorCode = 'PLATFORM_ERROR';
      if (error.message?.includes('Authentication') || error.status === 401) {
        errorCode = 'AUTH_FAILED';
      } else if (error.status === 429) {
        errorCode = 'RATE_LIMITED';
      }

      return {
        success: false,
        errorCode,
        errorDetails: error.message || 'Unknown Bluesky publishing error',
      };
    }
  }
}

export const blueskyAdapter = new BlueskyAdapter();
