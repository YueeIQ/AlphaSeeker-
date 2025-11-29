import { User, UserCloudData } from '../types';

// Use the local proxy path defined in vite.config.ts (local) and vercel.json (production)
const API_BASE = "/api/kv";
const APP_PREFIX = "alphaseeker_v1_user_";

// Helper: Convert string to Hex to ensure absolute URL safety for Keys (avoids @, ., / issues in proxy)
const toHex = (str: string): string => {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return result;
};

// Helper: Encode data for URL value (Base64 -> URL Safe Base64)
const encodeData = (data: any): string => {
  const json = JSON.stringify(data);
  // 1. Unicode safe Base64 encoding
  const base64 = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (match, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
  // 2. Make it URL safe (replace / with _ and + with -) to avoid proxy path issues
  return base64.replace(/\//g, '_').replace(/\+/g, '-');
};

const decodeData = (encoded: string): any => {
  try {
    if (!encoded || encoded.trim().startsWith('<')) return null;
    
    // 1. Restore standard Base64
    let base64 = encoded.replace(/_/g, '/').replace(/-/g, '+');
    
    // 2. Decode Unicode safe Base64
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
  // Session Persistence
  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('alphaSeeker_current_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  logout: async () => {
    localStorage.removeItem('alphaSeeker_current_user');
  },

  // REGISTER
  register: async (email: string, password: string): Promise<User> => {
    // FIX: Use Hex encoded email for the key to avoid special chars like @ in URL path
    const safeKey = `${APP_PREFIX}${toHex(email)}`;

    // 1. Check if user exists
    const checkRes = await fetch(`${API_BASE}/${safeKey}`);
    
    if (checkRes.ok) {
        const checkData = await checkRes.text();
        // If we got valid data back, user exists
        if (checkData && checkData !== "null" && !checkData.trim().startsWith('<')) {
           throw new Error('该邮箱已被注册，请直接登录');
        }
    }

    const initialPayload = { password, data: null };
    const val = encodeData(initialPayload);
    
    // 2. Save to Cloud
    const saveRes = await fetch(`${API_BASE}/${safeKey}/${val}`, { method: 'POST' });
    
    if (!saveRes.ok) {
      throw new Error('注册失败，云端服务暂时不可用');
    }

    const user: User = { email, name: email.split('@')[0] };
    localStorage.setItem('alphaSeeker_current_user', JSON.stringify(user));
    return user;
  },

  // LOGIN
  login: async (email: string, password: string): Promise<User> => {
    const safeKey = `${APP_PREFIX}${toHex(email)}`;
    
    try {
      const res = await fetch(`${API_BASE}/${safeKey}`);
      
      // Handle 404 (Key not found)
      if (res.status === 404) {
         throw new Error('账号不存在，请先注册');
      }
      
      const rawText = await res.text();

      // Check for empty, null, or HTML (error page from proxy)
      if (!rawText || rawText === "null" || rawText.trim().startsWith('<')) {
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
      if (e.message.includes('账号') || e.message.includes('密码')) {
        throw e;
      }
      console.error("Login error details:", e);
      throw new Error('登录失败，请检查网络');
    }
  },

  // SAVE
  saveData: async (email: string, data: UserCloudData): Promise<void> => {
    const safeKey = `${APP_PREFIX}${toHex(email)}`;
    
    // Fetch current to preserve password
    const res = await fetch(`${API_BASE}/${safeKey}`);
    if (!res.ok) return;
    
    const rawText = await res.text();
    if (!rawText || rawText === "null" || rawText.startsWith('<')) return;

    const remoteRecord = decodeData(rawText);
    if (!remoteRecord) return;
    
    const updatedRecord = {
      ...remoteRecord,
      data: {
        ...data,
        lastSynced: Date.now()
      }
    };

    const val = encodeData(updatedRecord);
    await fetch(`${API_BASE}/${safeKey}/${val}`, { method: 'POST' });
  },

  // LOAD
  loadData: async (email: string): Promise<UserCloudData | null> => {
    const safeKey = `${APP_PREFIX}${toHex(email)}`;
    
    const res = await fetch(`${API_BASE}/${safeKey}`);
    if (!res.ok) return null;
    
    const rawText = await res.text();
    if (!rawText || rawText === "null" || rawText.startsWith('<')) return null;

    const remoteRecord = decodeData(rawText);
    return remoteRecord?.data || null;
  }
};