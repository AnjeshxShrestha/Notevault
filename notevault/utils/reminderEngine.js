const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const logger = require('../utils/logger');

/**
 * Check if a recurring reminder should trigger now
 */
const shouldTriggerRecurring = (reminder, now) => {
  const rec = reminder.recurrence;
  const lastTriggered = reminder.lastTriggeredAt;

  // Check if end date has passed
  if (rec.endDate && now > new Date(rec.endDate)) {
    return false;
  }

  switch (rec.type) {
    case 'daily': {
      // Trigger once per day
      if (lastTriggered) {
        const lastDate = new Date(lastTriggered);
        // Already triggered today?
        if (
          lastDate.getFullYear() === now.getFullYear() &&
          lastDate.getMonth() === now.getMonth() &&
          lastDate.getDate() === now.getDate()
        ) {
          return false;
        }
      }
      // Check if current time matches the reminder time (within the current minute)
      const reminderTime = new Date(reminder.dateTime);
      return (
        now.getHours() === reminderTime.getHours() &&
        now.getMinutes() === reminderTime.getMinutes()
      );
    }

    case 'weekly': {
      const targetDay = rec.dayOfWeek !== undefined
        ? rec.dayOfWeek
        : new Date(reminder.dateTime).getDay();

      if (now.getDay() !== targetDay) return false;

      // Check not already triggered this week
      if (lastTriggered) {
        const lastDate = new Date(lastTriggered);
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        if (lastDate > weekAgo) return false;
      }

      const reminderTime = new Date(reminder.dateTime);
      return (
        now.getHours() === reminderTime.getHours() &&
        now.getMinutes() === reminderTime.getMinutes()
      );
    }

    case 'monthly': {
      const targetDay = rec.dayOfMonth || new Date(reminder.dateTime).getDate();

      if (now.getDate() !== targetDay) return false;

      // Check not already triggered this month
      if (lastTriggered) {
        const lastDate = new Date(lastTriggered);
        if (
          lastDate.getFullYear() === now.getFullYear() &&
          lastDate.getMonth() === now.getMonth()
        ) {
          return false;
        }
      }

      const reminderTime = new Date(reminder.dateTime);
      return (
        now.getHours() === reminderTime.getHours() &&
        now.getMinutes() === reminderTime.getMinutes()
      );
    }

    case 'yearly': {
      const targetMonth = rec.month
        ? rec.month - 1
        : new Date(reminder.dateTime).getMonth();
      const targetDay = rec.dayOfMonth || new Date(reminder.dateTime).getDate();

      if (now.getMonth() !== targetMonth || now.getDate() !== targetDay) return false;

      // Check not already triggered this year
      if (lastTriggered) {
        const lastDate = new Date(lastTriggered);
        if (lastDate.getFullYear() === now.getFullYear()) return false;
      }

      const reminderTime = new Date(reminder.dateTime);
      return (
        now.getHours() === reminderTime.getHours() &&
        now.getMinutes() === reminderTime.getMinutes()
      );
    }

    default:
      return false;
  }
};

/**
 * Process all active reminders
 */
const processReminders = async () => {
  const now = new Date();

  try {
    // Find all active reminders
    const reminders = await Reminder.find({ isActive: true });

    let triggeredCount = 0;

    for (const reminder of reminders) {
      let shouldTrigger = false;

      if (reminder.recurrence.type === 'none') {
        // One-time reminder: trigger if time has passed and not yet triggered
        if (!reminder.triggered && reminder.dateTime && reminder.dateTime <= now) {
          shouldTrigger = true;
        }
      } else {
        // Recurring reminder
        shouldTrigger = shouldTriggerRecurring(reminder, now);
      }

      if (shouldTrigger) {
        try {
          if (reminder.recurrence.type === 'none') {
            // Mark one-time reminders as done
            reminder.triggered = true;
            reminder.triggeredAt = now;
          } else {
            // Update last triggered for recurring
            reminder.lastTriggeredAt = now;
            reminder.triggered = true;
            reminder.triggeredAt = now;
          }

          await reminder.save();
          triggeredCount++;

          logger.info(
            `Reminder triggered: "${reminder.title}" (${reminder._id}) for user: ${reminder.user}`
          );
        } catch (saveError) {
          logger.error(`Failed to save triggered reminder ${reminder._id}: ${saveError.message}`);
        }
      }
    }

    if (triggeredCount > 0) {
      logger.info(`Reminder engine: triggered ${triggeredCount} reminder(s) at ${now.toISOString()}`);
    }

  } catch (error) {
    logger.error(`Reminder engine error: ${error.message}`);
  }
};

/**
 * Start the reminder cron job
 * Runs every minute: '* * * * *'
 */
const startReminderEngine = () => {
  // Run every minute
  const task = cron.schedule('* * * * *', processReminders, {
    scheduled: true,
    timezone: 'UTC',
  });

  logger.info('Reminder engine started - checking every minute');
  return task;
};

module.exports = { startReminderEngine, processReminders };
