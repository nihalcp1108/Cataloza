import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IOtpChallenge extends Document {
  challengeId: string;
  userId: Types.ObjectId;
  email: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  resendCount: number;
  lastSentAt: Date;
  used: boolean;
  consumedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OtpChallengeSchema = new Schema<IOtpChallenge>(
  {
    challengeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    resendCount: {
      type: Number,
      default: 1,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    used: {
      type: Boolean,
      default: false,
      index: true,
    },
    consumedAt: {
      type: Date,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically purge old challenges 2 hours after expiration
OtpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7200 });

export const OtpChallenge = mongoose.model<IOtpChallenge>('OtpChallenge', OtpChallengeSchema);
