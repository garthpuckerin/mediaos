import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load tokens from localStorage on mount
  useEffect(() => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (storedRefreshToken) {
      setRefreshTokenValue(storedRefreshToken);
      // Try to refresh and get user info
      refreshTokenWithValue(storedRefreshToken)
        .catch(() => {
          // If refresh fails, clear tokens
          localStorage.removeItem('refreshToken');
          setRefreshTokenValue(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh token before expiry (access tokens expire in 15 minutes)
  useEffect(() => {
    if (!accessToken || !refreshTokenValue) return;

    // Refresh after 14 minutes (before 15-minute expiry)
    const refreshInterval = setInterval(
      () => {
        refreshTokenWithValue(refreshTokenValue).catch(() => {
          // If refresh fails, log out
          logout();
        });
      },
      14 * 60 * 1000
    );

    return () => clearInterval(refreshInterval);
  }, [accessToken, refreshTokenValue]);

  async function refreshTokenWithValue(token: string): Promise<void> {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    setAccessToken(data.accessToken);

    // Fetch user info
    const userResponse = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      setUser(userData.user);
    }
  }

  async function login(email: string, password: string): Promise<void> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    setUser(data.user);
    setAccessToken(data.accessToken);
    setRefreshTokenValue(data.refreshToken);
    localStorage.setItem('refreshToken', data.refreshToken);
  }

  async function register(email: string, password: string): Promise<void> {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    setUser(data.user);
    setAccessToken(data.accessToken);
    setRefreshTokenValue(data.refreshToken);
    localStorage.setItem('refreshToken', data.refreshToken);
  }

  function logout(): void {
    setUser(null);
    setAccessToken(null);
    setRefreshTokenValue(null);
    localStorage.removeItem('refreshToken');
  }

  async function refreshToken(): Promise<void> {
    if (!refreshTokenValue) {
      throw new Error('No refresh token available');
    }
    await refreshTokenWithValue(refreshTokenValue);
  }

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
