import { defineTask } from "nitro/task";
import bcrypt from "bcryptjs";
import { ensureDb } from "../utils/mongoose";
import { User } from "../models/User";

/**
 * Create or promote an admin user. Run:
 *   bunx nitro task run seed --payload '{"username":"root","email":"admin@example.com","password":"hunter2"}'
 */
export default defineTask({
  meta: {
    name: "seed",
    description: "Create or promote an admin user",
  },
  async run({ payload }) {
    const { username, email, password } = (payload ?? {}) as {
      username?: string;
      email?: string;
      password?: string;
    };

    if (!username || !email || !password) {
      return {
        result: "Missing payload: { username, email, password }",
      };
    }

    await ensureDb();
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        passwordHash,
        role: "admin",
        emailVerified: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return { result: `admin ready: ${user.username} (${user.email})` };
  },
});
