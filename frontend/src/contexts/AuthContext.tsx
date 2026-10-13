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

interface AuthContextType {
  user: IUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifySuperAdminOtp: (challengeId: string, otp: string) => Promise<IUser>;
  resendSuperAdminOtp: (challengeId: string) => Promise<void>;
  register: (data: any) => Promise<IUser>;
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
    
    // Check if 2FA OTP is required (e.g. for cpnihal35@gmail.com)
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

  const verifySuperAdminOtp = async (challengeId: string, otp: string): Promise<IUser> => {
    const res = await api.post('/auth/super-admin/verify-otp', { challengeId, otp });
    const { user: loggedInUser, accessToken } = res.data.data;
    if (accessToken) {
      localStorage.setItem('wf_access_token', accessToken);
    }
    setUser(loggedInUser);
    return loggedInUser;
  };

  const resendSuperAdminOtp = async (challengeId: string): Promise<void> => {
    await api.post('/auth/super-admin/resend-otp', { challengeId });
  };

  const register = async (data: any): Promise<IUser> => {
    const res = await api.post('/auth/register', data);
    const { user: registeredUser, accessToken } = res.data.data;
    if (accessToken) {
      localStorage.setItem('wf_access_token', accessToken);
    }
    setUser(registeredUser);
    return registeredUser;
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
