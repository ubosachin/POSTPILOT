import { Platform, GenerateContentInput, GeneratedVariantResult } from '@/types';

/**
 * Validates text against platform constraints
 */
export function validatePlatformVariant(platform: Platform, text: string): string[] {
  const warnings: string[] = [];
  const len = text.length;

  if (platform === 'x') {
    if (len > 280) {
      warnings.push(`Exceeds X limit of 280 characters (${len}/280). Needs trimming.`);
    } else if (len > 250) {
      warnings.push(`Approaching X limit (${len}/280).`);
    }
    const hashtags = (text.match(/#[a-zA-Z0-9_]+/g) || []).length;
    if (hashtags > 3) {
      warnings.push(`Found ${hashtags} hashtags. X best practice is maximum 1-2 focused hashtags.`);
    }
  }

  if (platform === 'bluesky') {
    if (len > 300) {
      warnings.push(`Exceeds Bluesky limit of 300 characters (${len}/300).`);
    } else if (len > 270) {
      warnings.push(`Approaching Bluesky limit (${len}/300).`);
    }
  }

  if (platform === 'quora') {
    if (len < 150) {
      warnings.push(`Quora answers perform best with detailed, comprehensive depth (>150 chars).`);
    }
  }

  return warnings;
}

/**
 * Try generating with external Gemini API if key is present
 */
async function callGemini(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
          },
        }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (e) {
    console.warn('[AI Generator] Gemini API call skipped or failed, using built-in model:', e);
    return null;
  }
}

/**
 * Try generating with OpenAI API if key is present
 */
async function callOpenAI(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.warn('[AI Generator] OpenAI API call skipped or failed, using built-in model:', e);
    return null;
  }
}

/**
 * Generates platform-specific variations using intelligent multi-tone heuristics
 * or external LLM API if configured.
 */
export async function generateVariants(
  input: GenerateContentInput
): Promise<GeneratedVariantResult[]> {
  const { topic, audience, goal, brandVoice, sourceMaterial, platforms } = input;
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  const variants: GeneratedVariantResult[] = [];

  for (const platform of platforms) {
    let text = '';
    const cleanTopic = topic.length > 55 ? topic.substring(0, 52) + '...' : topic;

    // 1. Try External LLM if keys are configured
    if (geminiKey || openAiKey) {
      let systemConstraints = '';
      if (platform === 'x') {
        systemConstraints = `Write a viral, punchy X (Twitter) post about "${topic}". Must be strictly under 260 characters. Include 1 focused hashtag. Do not use quotes.`;
      } else if (platform === 'bluesky') {
        systemConstraints = `Write a conversational, community-first Bluesky post about "${topic}". Must be strictly under 280 characters. No hashtags. Spark open discussion.`;
      } else if (platform === 'quora') {
        systemConstraints = `Write an authoritative, comprehensive Quora answer to "What is the best approach to ${topic}?". Structure with 3 key points and a concise TL;DR. Length: 250-400 words.`;
      }

      const fullPrompt = `${systemConstraints}\nTarget Audience: ${audience || 'Founders & Engineers'}\nTone: ${brandVoice || 'Authoritative & Pragmatic'}\nGoal: ${goal || 'Thought Leadership'}\n${sourceMaterial ? `Reference Context: ${sourceMaterial}` : ''}`;

      const aiText = geminiKey ? await callGemini(fullPrompt, geminiKey) : await callOpenAI(fullPrompt, openAiKey!);
      if (aiText) {
        text = aiText;
      }
    }

    // 2. High-fidelity built-in engine if no LLM key or LLM timed out
    if (!text) {
      const isTech = brandVoice?.toLowerCase().includes('tech') || goal?.toLowerCase().includes('tech');
      const isViral = brandVoice?.toLowerCase().includes('viral') || goal?.toLowerCase().includes('viral');

      if (platform === 'x') {
        if (isTech) {
          text = `Architecture note on ${cleanTopic}:\n\nDecouple state from distribution. If your publishing pipeline isn't idempotent and fault-tolerant, you're building tech debt into prod.\n\nSimple primitives beat complex microservices.`;
        } else if (isViral) {
          text = `Unpopular opinion on ${cleanTopic}:\n\nMost founders spend 80% of their time building and 20% on distribution.\n\nFlip that ratio if you want to survive 2026.\n\n#BuildInPublic`;
        } else {
          text = `90% of builders approach ${cleanTopic} the wrong way.\n\nWhat actually works:\n1. Compounding inputs\n2. Automated distribution\n3. Protecting build focus\n\nConsistency beats intensity.\n\n#BuildInPublic`;
        }
      } else if (platform === 'bluesky') {
        if (isTech) {
          text = `Working on ${cleanTopic} today.\n\nThe biggest takeaway: handling at-least-once message delivery gracefully saves you from endless 2 AM debugging.\n\nWhat queue architectures are you all using on AT Protocol?`;
        } else {
          text = `Quick insight on ${cleanTopic}:\n\nThe real leverage isn't working longer hours—it's building automated distribution loops.\n\nWhat's your experience with this? Curious what others are building in this space.`;
        }
      } else if (platform === 'quora') {
        text = `What is the most effective approach to ${topic}?\n\nHere is a comprehensive breakdown based on practical experience:\n\n1. Establish the core foundation first\nBefore scaling or optimizing, ensure you have reliable fundamentals. Skipping initial validation is where most people waste months.\n\n2. Build automated, predictable systems\nManual execution creates cognitive fatigue. Setting up scheduled workflows and modular processes ensures your output remains consistent regardless of daily motivation.\n\n3. Iterate based on empirical metrics, not intuition\nTrack real engagement patterns and retention. Double down on what resonates and discard what doesn't.\n\nTL;DR: Consistency backed by structured systems will always outperform erratic bursts of inspiration.`;
      }
    }

    const warnings = validatePlatformVariant(platform, text);

    variants.push({
      platform,
      text,
      status: 'draft',
      warnings,
      suggestedHashtags: platform === 'x' ? ['#Tech', '#SaaS', '#Growth'] : [],
      quoraQuestionUrl: platform === 'quora' ? `https://www.quora.com/search?q=${encodeURIComponent(topic)}` : undefined,
    });
  }

  return variants;
}

/**
 * Regenerates a single platform variant
 */
export async function regenerateSinglePlatform(
  input: GenerateContentInput,
  platform: Platform
): Promise<GeneratedVariantResult> {
  const results = await generateVariants({
    ...input,
    platforms: [platform],
  });
  return results[0];
}
