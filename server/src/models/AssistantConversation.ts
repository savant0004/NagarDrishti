import mongoose, { Document, Schema } from 'mongoose';

export type AssistantMessageRole = 'user' | 'assistant';

export interface IAssistantMessage {
  role: AssistantMessageRole;
  content: string;
  createdAt: Date;
}

export interface IAssistantConversation extends Document {
  id: string;
  userId: string;
  title: string;
  messages: IAssistantMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IAssistantMessage>({
  role: { type: String, required: true, enum: ['user', 'assistant'] },
  content: { type: String, required: true, maxlength: 4000 },
  createdAt: { type: Date, required: true, default: Date.now },
}, { _id: false });

const ConversationSchema = new Schema<IAssistantConversation>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true, maxlength: 100, default: 'New conversation' },
  messages: { type: [MessageSchema], default: [], validate: (messages: IAssistantMessage[]) => messages.length <= 40 },
}, { timestamps: true });

ConversationSchema.index({ userId: 1, updatedAt: -1 });

export const AssistantConversationModel = mongoose.model<IAssistantConversation>('AssistantConversation', ConversationSchema);
