import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'citizen' | 'municipal_staff' | 'admin';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, required: true, enum: ['citizen', 'municipal_staff', 'admin'], default: 'citizen' },
}, { timestamps: true });

export const UserModel = mongoose.model<IUser>('User', UserSchema);
