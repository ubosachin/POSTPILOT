export interface QuoraWorkspaceItem {
  id: string;
  questionUrl: string;
  topic: string;
  answerDraft: string;
  status: 'draft' | 'copied' | 'manually_published';
  publishedAt?: Date;
  notes?: string;
}

export class QuoraWorkflow {
  /**
   * Validates if a string is a valid Quora question URL
   */
  static isValidQuoraUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname.includes('quora.com') && parsed.pathname.length > 2;
    } catch {
      return false;
    }
  }

  /**
   * Formats the AI draft into a well-structured Quora answer markdown with sections and TL;DR
   */
  static formatForClipboard(answer: string, questionUrl?: string): string {
    const header = questionUrl ? `Original Question: ${questionUrl}\n\n` : '';
    return `${header}${answer.trim()}\n\n---\nDrafted via PostPilot AI Studio`;
  }
}
