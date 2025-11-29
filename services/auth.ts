import { User, UserCloudData } from '../types';

// Key for our simulated "Database" in localStorage
const DB_KEY = 'alphaSeeker_users_db';
const CURRENT_USER_KEY = 'alphaSeeker_current_user';

// Helper to delay execution to simulate network request
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getDb = () => {
  const dbStr = localStorage.getItem(DB_KEY);
  return dbStr ? JSON.parse(dbStr) : {};
};

const saveDb = (db: any) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

export const AuthService = {
  // Check if user is already logged in (session persistence)
  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem(CURRENT_USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  login: async (email: string, password: string): Promise<User> => {
    await delay(800); // Simulate API latency
    
    const db = getDb();
    const userRecord = db[email];

    if (!userRecord || userRecord.password !== password) {
      throw new Error('账号或密码错误。注意：账号仅保存在当前浏览器，若更换了设备，请使用“恢复数据”功能导入备份。');
    }

    const user: User = { email, name: email.split('@')[0] };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  },

  register: async (email: string, password: string): Promise<User> => {
    await delay(1000);
    
    const db = getDb();
    if (db[email]) {
      throw new Error('该邮箱已被注册');
    }

    // Create new user record
    db[email] = {
      password,
      data: null // Empty data initially
    };
    saveDb(db);

    const user: User = { email, name: email.split('@')[0] };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  },

  logout: async () => {
    await delay(200);
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  // Save Data to "Cloud"
  saveData: async (email: string, data: UserCloudData): Promise<void> => {
    // console.log('Syncing data to cloud for', email); 
    const db = getDb();
    if (db[email]) {
      db[email].data = {
        ...data,
        lastSynced: Date.now()
      };
      saveDb(db);
    }
  },

  // Load Data from "Cloud"
  loadData: async (email: string): Promise<UserCloudData | null> => {
    await delay(600);
    const db = getDb();
    if (db[email] && db[email].data) {
      return db[email].data as UserCloudData;
    }
    return null;
  }
};