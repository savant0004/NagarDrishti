import mongoose, { Document, Schema } from 'mongoose';

export type NotificationKind = 'complaint_submitted' | 'complaint_assigned' | 'status_changed' | 'priority_changed' | 'duplicate_linked' | 'complaint_resolved';
export interface INotification extends Document {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  message: string;
  reportId?: string;
  dedupeKey: string;
  readAt?: Date | null;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  kind: { type: String, enum: ['complaint_submitted', 'complaint_assigned', 'status_changed', 'priority_changed', 'duplicate_linked', 'complaint_resolved'], required: true },
  title: { type: String, required: true, maxlength: 120 },
  message: { type: String, required: true, maxlength: 400 },
  reportId: { type: String, default: '' },
  dedupeKey: { type: String, required: true, unique: true },
  readAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });
NotificationSchema.index({ userId: 1, createdAt: -1 });

export const NotificationModel = mongoose.model<INotification>('Notification', NotificationSchema);
