import 'dotenv/config';
import bcrypt from 'bcrypt';
import User from '../database/models/user.js';

const SALT_ROUNDS = 10;

async function migratePasswords() {
  try {
    const users = await User.find({});
    console.log(`Found ${users.length} users`);

    for (const user of users) {
      // 检查密码是否已经是 bcrypt 哈希（bcrypt 哈希以 $2b$ 或 $2a$ 开头）
      if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
        console.log(`User ${user.email} already has hashed password, skipping`);
        continue;
      }

      // 明文密码加密
      const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
      user.password = hashedPassword;
      await user.save();
      console.log(`Migrated password for user: ${user.email}`);
    }

    console.log('Migration completed');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migratePasswords();
