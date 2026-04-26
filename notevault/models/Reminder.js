const mongoose = require('mongoose');

const recurrenceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
      default: 'none',
    },
    // For weekly: 0=Sun, 1=Mon, ..., 6=Sat
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
    },
    // For monthly: day of month (1-31)
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31,
    },
    // For yearly: month (1-12) and day
    month: {
      type: Number,
      min: 1,
      max: 12,
    },
    // End recurrence after this date (optional)
    endDate: {
      type: Date,
    },
  },
  { _id: false }
);

const reminderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reminder must belong to a user'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Reminder title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    // Optional reference to a note
    note: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      default: null,
    },
    // For one-time reminders
    dateTime: {
      type: Date,
      required: function () {
        return this.recurrence.type === 'none';
      },
    },
    recurrence: {
      type: recurrenceSchema,
      default: () => ({ type: 'none' }),
    },
    // Tracking trigger state
    triggered: {
      type: Boolean,
      default: false,
    },
    triggeredAt: {
      type: Date,
      default: null,
    },
    // For recurring: when it was last triggered
    lastTriggeredAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for the cron job: find active reminders efficiently
reminderSchema.index({ user: 1, isActive: 1, triggered: 1 });
reminderSchema.index({ dateTime: 1, isActive: 1 });

const Reminder = mongoose.model('Reminder', reminderSchema);
module.exports = Reminder;
