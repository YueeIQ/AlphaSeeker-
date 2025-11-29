import React, { useState } from 'react';
import { AuthService } from '../services/auth';
import { User, UserCloudData } from '../types';
import { X, Loader2, LogIn, UserPlus, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User, cloudData: UserCloudData | null) => void;
  currentData?: UserCloudData; // Data to sync upon registration
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess, currentData }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLoginMode) {
        // Login Flow
        const user = await AuthService.login(email, password);
        const data = await AuthService.loadData(email);
        onLoginSuccess(user, data);
        onClose();
      } else {
        // Register Flow
        const user = await AuthService.register(email, password);
        // If registering, we automatically sync current local data to the new account
        if (currentData) {
            await AuthService.saveData(user.email, currentData);
        }
        onLoginSuccess(user, null); // No cloud data to load, we just saved current
        onClose();
      }
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {isLoginMode ? <LogIn size={20} className="text-indigo-600"/> : <UserPlus size={20} className="text-indigo-600"/>}
            {isLoginMode ? '账号登录' : '注册新账号'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8">
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
             {isLoginMode 
               ? '登录后将自动从云端拉取您的投资组合数据。' 
               : '注册并开启云端同步，随时随地管理您的资产。'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱地址</label>
              <input 
                type="email" 
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition bg-gray-50 focus:bg-white"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input 
                type="password" 
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition bg-gray-50 focus:bg-white"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition font-bold flex items-center justify-center gap-2 mt-2 disabled:opacity-70 shadow-lg shadow-indigo-200"
            >
              {loading && <Loader2 className="animate-spin" size={20} />}
              {isLoginMode ? '立即登录' : '创建账号'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              type="button"
              onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}
              className="text-sm text-gray-500 hover:text-indigo-600 transition underline underline-offset-4"
            >
              {isLoginMode ? '没有账号？去注册' : '已有账号？去登录'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;