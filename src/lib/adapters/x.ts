import crypto from 'crypto';

export interface XCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  accessTokenSecret?: string;
  bearerToken?: string;
  oauth2Token?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  twitterUserId?: string;
  scope?: string;
  isSandbox?: boolean;
}

export interface XPublishResult {
  success: boolean;
  tweetId?: string;
  postUrl?: string;
  errorCode?: string;
  errorDetails?: string;
}

export class XAdapter {
  /**
   * Helper to generate OAuth 1.0a header for Twitter API v2
   */
  private generateOAuth1Header(
    method: string,
    url: string,
    creds: XCredentials
  ): string {
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: creds.apiKey || '',
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: creds.accessToken || '',
      oauth_version: '1.0',
    };

    const signatureBase = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(
        Object.keys(oauthParams)
          .sort()
          .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
          .join('&')
      ),
    ].join('&');

    const signingKey = `${encodeURIComponent(creds.apiSecret || '')}&${encodeURIComponent(creds.accessTokenSecret || '')}`;
    const signature = crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');

    oauthParams['oauth_signature'] = signature;

    return (
      'OAuth ' +
      Object.keys(oauthParams)
        .sort()
        .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
        .join(', ')
    );
  }

  /**
   * Publish a tweet to X API v2
   */
  async publishTweet(creds: XCredentials, text: string): Promise<XPublishResult> {
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        errorCode: 'EMPTY_CONTENT',
        errorDetails: 'Cannot publish an empty post to X.',
      };
    }

    if (text.length > 280) {
      return {
        success: false,
        errorCode: 'CHARACTER_LIMIT_EXCEEDED',
        errorDetails: `Content length (${text.length}) exceeds X limit of 280 characters.`,
      };
    }

    // Sandbox / Simulation fallback when test mode or placeholder credentials
    const hasOAuth2 = Boolean(creds.oauth2Token && creds.oauth2Token.trim().length > 0);
    const hasOAuth1 = Boolean(creds.apiKey && creds.accessToken && !creds.apiKey.startsWith('test-'));

    if (creds.isSandbox || (!hasOAuth2 && !hasOAuth1)) {
      const mockTweetId = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
      return {
        success: true,
        tweetId: mockTweetId,
        postUrl: `https://x.com/PostPilotApp/status/${mockTweetId}`,
      };
    }

    try {
      const endpoint = 'https://api.x.com/2/tweets';
      let authHeader: string;
      if (hasOAuth2) {
        authHeader = `Bearer ${creds.oauth2Token}`;
      } else {
        authHeader = this.generateOAuth1Header('POST', endpoint, creds);
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        let errorCode = 'X_API_ERROR';
        if (res.status === 401 || res.status === 403) errorCode = 'AUTH_FAILED';
        if (res.status === 429) errorCode = 'RATE_LIMITED';

        return {
          success: false,
          errorCode,
          errorDetails: data.detail || data.title || JSON.stringify(data),
        };
      }

      const tweetId = data.data?.id;
      return {
        success: true,
        tweetId,
        postUrl: `https://x.com/i/web/status/${tweetId}`,
      };
    } catch (err) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        errorDetails: (err as Error).message,
      };
    }
  }
}

export const xAdapter = new XAdapter();
