import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { IUser } from '../types';

export interface LoginResult {
  user?: IUser;
  requiresOtp?: boolean;
  challengeId?: string;
  email?: string;
  message?: string;
}

export interface RegisterResult {
  user?: IUser;
  requiresOtp?: boolean;
  challengeId?: string;
  email?: string;
  message?: string;
}

interface AuthContextType {
  user: IUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyOtp: (challengeId: string, otp: string) => Promise<IUser>;
  resendOtp: (challengeId: string) => Promise<void>;
  verifySuperAdminOtp: (challengeId: string, otp: string) => Promise<IUser>;
  resendSuperAdminOtp: (challengeId: string) => Promise<void>;
  register: (data: any) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  changeInitialPassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<void>;
  isSuperAdmin: boolean;
  isShopAdmin: boolean;
  isCustomer: boolean;
  assignedShopId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('wf_access_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data?.success && res.data?.data?.user) {
        setUser(res.data.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      localStorage.removeItem('wf_access_token');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const res = await api.post('/auth/login', { email, password });
    
    // Check if 2FA OTP is required (e.g. for cpnihal35@gmail.com or unverified user)
    if (res.data?.requiresOtp) {
      return {
        requiresOtp: true,
        challengeId: res.data.data?.challengeId,
        email: res.data.data?.email || email,
        message: res.data.message,
      };
    }

    const { user: loggedInUser, accessToken } = res.data.data;
    if (accessToken) {
      localStorage.setItem('wf_access_token', accessToken);
    }
    setUser(loggedInUser);
    return { user: loggedInUser };
  };

  const verifyOtp = async (challengeId: string, otp: string): Promise<IUser> => {
    const res = await api.post('/auth/verify-otp', { challengeId, otp });
    const { user: loggedInUser, accessToken } = res.data.data;
    if (accessToken) {
      localStorage.setItem('wf_access_token', accessToken);
    }
    setUser(loggedInUser);
    return loggedInUser;
  };

  const resendOtp = async (challengeId: string): Promise<void> => {
    await api.post('/auth/resend-otp', { challengeId });
  };

  const verifySuperAdminOtp = async (challengeId: string, otp: string): Promise<IUser> => {
    return verifyOtp(challengeId, otp);
  };

  const resendSuperAdminOtp = async (challengeId: string): Promise<void> => {
    return resendOtp(challengeId);
  };

  const register = async (data: any): Promise<RegisterResult> => {
    const res = await api.post('/auth/register', data);
    if (res.data?.requiresOtp) {
      return {
        requiresOtp: true,
        challengeId: res.data.data?.challengeId,
        email: res.data.data?.email || data.email,
        message: res.data.message,
      };
    }
    const { user: registeredUser, accessToken } = res.data.data;
    if (accessToken) {
      localStorage.setItem('wf_access_token', accessToken);
    }
    setUser(registeredUser);
    return { user: registeredUser };
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('wf_access_token');
      setUser(null);
    }
  };

  const refreshUser = async (): Promise<void> => {
    await fetchCurrentUser();
  };

  const changeInitialPassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<void> => {
    const res = await api.post('/auth/change-initial-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (res.data?.success && res.data?.data?.user) {
      setUser(res.data.data.user);
    } else {
      await fetchCurrentUser();
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isShopAdmin = user?.role === 'shop_admin';
  const isCustomer = user?.role === 'customer';

  const assignedShopId =
    user?.assignedShopIds && user.assignedShopIds.length > 0
      ? typeof user.assignedShopIds[0] === 'string'
        ? user.assignedShopIds[0]
        : (user.assignedShopIds[0] as any)._id
      : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        verifyOtp,
        resendOtp,
        verifySuperAdminOtp,
        resendSuperAdminOtp,
        register,
        logout,
        refreshUser,
        changeInitialPassword,
        isSuperAdmin,
        isShopAdmin,
        isCustomer,
        assignedShopId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
