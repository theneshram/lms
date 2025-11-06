import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['ADMIN','TEACHER','TA','STUDENT'], default: 'STUDENT', index: true }
}, { timestamps: true });

UserSchema.pre('save', async function(next){
  if(!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.compare = function(pw){
  return bcrypt.compare(pw, this.password);
};

export default mongoose.model('User', UserSchema);