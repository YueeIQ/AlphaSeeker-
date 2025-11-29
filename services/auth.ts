import { User, UserCloudData } from '../types';

// Using a public free Key-Value store API for demonstration purposes.
// In a real production app, this would be your own secure backend endpoint.
const API_BASE = "https://keyvalue.immanuel.co/api/Key/Value";
// Unique prefix to namespace our app's data in the public store
const APP_PREFIX = "alphaseeker_v1_user_";

// Helper to encode data for URL (since this specific API passes value in URL path)
// NOTE: For a production financial app, you MUST use strong encryption (AES) before sending data.
// Here we use Base64 + URL Encoding for basic transport and obfuscation.
const encodeData = (data: any): string => {
  const json = JSON.stringify(data);
  // Base64 encode to hide plain text
  const base64 = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (match, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
  return encodeURIComponent(base64);
};

const decodeData = (encoded: string): any => {
  try {
    const base64 = decodeURIComponent(encoded);
    const json = decodeURIComponent(Array.prototype.map.call(atob(base64), (c: string) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(json);
  } catch (e) {
    console.error("Decode error", e);
    return null;
  }
};

export const AuthService = {
  // Session Persistence (still local, just for "Remember Me" on this device)
  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('alphaSeeker_current_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  logout: async () => {
    localStorage.removeItem('alphaSeeker_current_user');
  },

  // REGISTER: Create a new key in the cloud
  register: async (email: string, password: string): Promise<User> => {
    // 1. Check if user exists
    const checkRes = await fetch(`${API_BASE}/${APP_PREFIX}${email}`);
    const checkData = await checkRes.text(); // API returns "null" string or value
    
    if (checkData && checkData !== "null") {
      throw new Error('该邮箱已被注册，请直接登录');
    }

    // 2. Create Initial Data Structure
    const initialPayload = {
      password, // Store password to verify login (In production: NEVER store plain password, hash it!)
      data: null
    };

    // 3. Save to Cloud
    // API Format: POST /api/Key/Value/{key}/{value}
    const val = encodeData(initialPayload);
    const saveRes = await fetch(`${API_BASE}/${APP_PREFIX}${email}/${val}`, { method: 'POST' });
    
    if (!saveRes.ok) {
      throw new Error('注册失败，云端服务暂时不可用');
    }

    const user: User = { email, name: email.split('@')[0] };
    localStorage.setItem('alphaSeeker_current_user', JSON.stringify(user));
    return user;
  },

  // LOGIN: Fetch key from cloud and verify password
  login: async (email: string, password: string): Promise<User> => {
    try {
      const res = await fetch(`${API_BASE}/${APP_PREFIX}${email}`);
      const rawText = await res.text();

      if (!rawText || rawText === "null") {
        throw new Error('账号不存在，请先注册');
      }

      const remoteRecord = decodeData(rawText);
      
      if (!remoteRecord || remoteRecord.password !== password) {
        throw new Error('邮箱或密码错误');
      }

      const user: User = { email, name: email.split('@')[0] };
      localStorage.setItem('alphaSeeker_current_user', JSON.stringify(user));
      return user;
    } catch (e: any) {
      throw new Error(e.message || '登录失败，请检查网络');
    }
  },

  // SAVE: Update only the 'data' part, keep password
  saveData: async (email: string, data: UserCloudData): Promise<void> => {
    // 1. We need to fetch current record first to keep the password intact
    // (Optimization: In a real app, backend handles this. Here we must read-modify-write)
    const res = await fetch(`${API_BASE}/${APP_PREFIX}${email}`);
    const rawText = await res.text();
    
    if (!rawText || rawText === "null") return; // Should not happen if logged in

    const remoteRecord = decodeData(rawText);
    
    // 2. Update data
    const updatedRecord = {
      ...remoteRecord,
      data: {
        ...data,
        lastSynced: Date.now()
      }
    };

    // 3. Push back to cloud
    const val = encodeData(updatedRecord);
    await fetch(`${API_BASE}/${APP_PREFIX}${email}/${val}`, { method: 'POST' });
  },

  // LOAD: Fetch data part
  loadData: async (email: string): Promise<UserCloudData | null> => {
    const res = await fetch(`${API_BASE}/${APP_PREFIX}${email}`);
    const rawText = await res.text();
    
    if (!rawText || rawText === "null") return null;

    const remoteRecord = decodeData(rawText);
    return remoteRecord.data || null;
  }
};