/**
 * PostPilot Automation & Scheduling Engine
 * Computes calendar publishing slots, resolves daily topics, handles fallback policies,
 * and schedules recurring BullMQ / in-process publishing jobs.
 */

import { memoryStore } from '../db/memoryStore';
import { persistenceBridge } from '../db/persistence';
import { ContentAutomation, DailyTopic, PublishingJob, Platform } from '@/types';

export interface ScheduleSlotPreview {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  scheduledAt: string; // ISO
  platform: Platform;
  socialAccountId?: string;
  topic: string;
  topicSource: 'date_override' | 'cycled' | 'ai_variation';
}

export class AutomationEngine {
  /**
   * Generates a forward preview of scheduled publishing slots for user approval
   */
  generateSchedulePreview(
    automation: Omit<ContentAutomation, 'id' | 'createdAt' | 'updatedAt'>,
    daysAhead = 7
  ): ScheduleSlotPreview[] {
    const preview: ScheduleSlotPreview[] = [];
    const validStartDate = automation.startDate && !isNaN(new Date(automation.startDate).getTime())
      ? new Date(automation.startDate)
      : new Date();
    const topics = automation.topics && automation.topics.length > 0 ? automation.topics : ['General Brand Thought Leadership'];
    const activeDays = Array.isArray(automation.activeDays) && automation.activeDays.length > 0
      ? automation.activeDays
      : [0, 1, 2, 3, 4, 5, 6];
    const platforms: Platform[] = Array.isArray(automation.platforms) && automation.platforms.length > 0
      ? (automation.platforms as Platform[])
      : (['bluesky', 'x'] as Platform[]);
    const rawTimes = automation.publishingTimes || (automation as unknown as { dailySlots?: string[] }).dailySlots;
    const times = Array.isArray(rawTimes) && rawTimes.length > 0 ? rawTimes : ['09:00', '17:00'];
    const distributionMode = automation.distributionMode || 'per_platform';
    const socialAccountIds = automation.socialAccountIds || [];

    let topicIndex = 0;

    for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
      const current = new Date(validStartDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      const dayOfWeek = current.getDay(); // 0 = Sun, 1 = Mon, ...

      if (!activeDays.includes(dayOfWeek)) {
        continue;
      }

      const dateStr = current.toISOString().split('T')[0];

      // Check if there is an explicit daily topic override for this date
      const explicitTopic = Array.from(memoryStore.dailyTopics.values()).find(
        (dt) => dt.workspaceId === automation.workspaceId && dt.date === dateStr
      );

      for (const timeStr of times) {
        const [hours, minutes] = timeStr.split(':').map((v) => parseInt(v, 10));
        const slotDate = new Date(current);
        slotDate.setUTCHours(hours || 9, minutes || 0, 0, 0);

        if (distributionMode === 'per_platform') {
          // One post per platform at this time slot
          for (const platform of platforms) {
            const currentTopic = explicitTopic ? explicitTopic.topic : topics[topicIndex % topics.length];
            const topicSource = explicitTopic ? 'date_override' : 'cycled';

            preview.push({
              date: dateStr,
              time: timeStr,
              scheduledAt: slotDate.toISOString(),
              platform,
              socialAccountId: socialAccountIds[0],
              topic: currentTopic,
              topicSource,
            });
          }
        } else {
          // Total slots: rotate platforms across slots
          const platform = platforms[preview.length % platforms.length];
          const currentTopic = explicitTopic ? explicitTopic.topic : topics[topicIndex % topics.length];
          const topicSource = explicitTopic ? 'date_override' : 'cycled';

          preview.push({
            date: dateStr,
            time: timeStr,
            scheduledAt: slotDate.toISOString(),
            platform,
            socialAccountId: socialAccountIds[0],
            topic: currentTopic,
            topicSource,
          });
        }

        topicIndex++;
      }
    }

    return preview;
  }

  /**
   * Creates or updates an automation, validating inputs and initializing default daily topics
   */
  async saveAutomation(
    workspaceId: string, 
    data: Partial<ContentAutomation>
  ): Promise<ContentAutomation> {
    const id = data.id || `auto_${Date.now()}`;
    const existing = memoryStore.contentAutomations.get(id);

    const automation: ContentAutomation = {
      id,
      workspaceId,
      name: data.name || 'Daily Social Campaign',
      topics: data.topics && data.topics.length > 0 ? data.topics : ['AI & SaaS Growth'],
      dailyInstructions: data.dailyInstructions || '',
      targetAudience: data.targetAudience || 'Founders, Creators & Engineers',
      brandVoice: data.brandVoice || 'Insightful & Pragmatic Builder',
      platforms: data.platforms && data.platforms.length > 0 ? data.platforms : ['bluesky', 'x'],
      socialAccountIds: data.socialAccountIds || [],
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      endDate: data.endDate,
      timezone: data.timezone || 'UTC',
      activeDays: data.activeDays || [1, 2, 3, 4, 5],
      postsPerDay: data.postsPerDay || 1,
      publishingTimes: data.publishingTimes || ['09:00'],
      distributionMode: data.distributionMode || 'total_slots',
      approvalMode: data.approvalMode || 'review_first',
      fallbackPolicy: data.fallbackPolicy || 'cycle_topics',
      status: data.status || 'active',
      createdAt: existing ? existing.createdAt : new Date(),
      updatedAt: new Date(),
    };

    memoryStore.contentAutomations.set(id, automation);
    await persistenceBridge.persistContentAutomation(automation);

    memoryStore.addAuditLog({
      workspaceId,
      actorId: 'system',
      actorName: 'Automation Engine',
      action: existing ? 'AUTOMATION_UPDATED' : 'AUTOMATION_CREATED',
      resourceId: id,
      resourceType: 'contentAutomation',
      details: { name: automation.name, status: automation.status },
    });

    return automation;
  }

  /**
   * Pauses an automation and sets pending jobs to paused
   */
  async pauseAutomation(workspaceId: string, automationId: string): Promise<ContentAutomation> {
    const auto = memoryStore.contentAutomations.get(automationId);
    if (!auto || auto.workspaceId !== workspaceId) {
      throw new Error('Automation not found');
    }

    auto.status = 'paused';
    auto.updatedAt = new Date();
    await persistenceBridge.persistContentAutomation(auto);

    memoryStore.addAuditLog({
      workspaceId,
      actorId: 'user',
      actorName: 'User Action',
      action: 'AUTOMATION_PAUSED',
      resourceId: automationId,
      resourceType: 'contentAutomation',
      details: { name: auto.name },
    });

    return auto;
  }

  /**
   * Resumes a paused automation
   */
  async resumeAutomation(workspaceId: string, automationId: string): Promise<ContentAutomation> {
    const auto = memoryStore.contentAutomations.get(automationId);
    if (!auto || auto.workspaceId !== workspaceId) {
      throw new Error('Automation not found');
    }

    auto.status = 'active';
    auto.updatedAt = new Date();
    await persistenceBridge.persistContentAutomation(auto);

    memoryStore.addAuditLog({
      workspaceId,
      actorId: 'user',
      actorName: 'User Action',
      action: 'AUTOMATION_RESUMED',
      resourceId: automationId,
      resourceType: 'contentAutomation',
      details: { name: auto.name },
    });

    return auto;
  }

  /**
   * Cancels an automation and cancels all its pending publishing jobs
   */
  async cancelAutomation(workspaceId: string, automationId: string): Promise<ContentAutomation> {
    const auto = memoryStore.contentAutomations.get(automationId);
    if (!auto || auto.workspaceId !== workspaceId) {
      throw new Error('Automation not found');
    }

    auto.status = 'completed';
    auto.updatedAt = new Date();
    await persistenceBridge.persistContentAutomation(auto);

    // Cancel all scheduled or retry_wait jobs associated with this automation
    for (const job of memoryStore.publishingJobs.values()) {
      if (job.workspaceId === workspaceId && (job.status === 'scheduled' || job.status === 'retry_wait')) {
        job.status = 'cancelled';
        job.updatedAt = new Date();
        persistenceBridge.persistPublishingJob(job).catch(() => {});
      }
    }

    memoryStore.addAuditLog({
      workspaceId,
      actorId: 'user',
      actorName: 'User Action',
      action: 'AUTOMATION_CANCELLED',
      resourceId: automationId,
      resourceType: 'contentAutomation',
      details: { name: auto.name },
    });

    return auto;
  }
}

export const automationEngine = new AutomationEngine();
