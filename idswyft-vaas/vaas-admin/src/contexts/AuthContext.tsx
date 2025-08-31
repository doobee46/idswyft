import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { AuthState, Admin, Organization, LoginRequest } from '../types.js';
import { apiClient } from '../services/api';
import { mockAdmin, mockOrganization, enableMockAuth, isMockAuthEnabled } from '../utils/mockData';

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { admin: Admin; organization: Organization; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_START' }
  | { type: 'REFRESH_SUCCESS'; payload: { admin: Admin; organization: Organization } }
  | { type: 'REFRESH_FAILURE' };

const initialState: AuthState = {
  isAuthenticated: false,
  admin: null,
  organization: null,
  token: null,
  loading: false,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
    case 'REFRESH_START':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        admin: action.payload.admin,
        organization: action.payload.organization,
        token: action.payload.token,
        loading: false,
        error: null,
      };

    case 'REFRESH_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        admin: action.payload.admin,
        organization: action.payload.organization,
        loading: false,
        error: null,
      };

    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        admin: null,
        organization: null,
        token: null,
        loading: false,
        error: action.payload,
      };

    case 'REFRESH_FAILURE':
    case 'LOGOUT':
      return {
        ...initialState,
      };

    default:
      return state;
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = async (credentials: LoginRequest) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const loginResponse = await apiClient.login(credentials);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          admin: loginResponse.admin,
          organization: loginResponse.organization,
          token: loginResponse.token,
        },
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Login failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.warn('Logout API call failed:', error);
    }
    
    dispatch({ type: 'LOGOUT' });
  };

  const refreshAuth = async () => {
    if (!apiClient.isAuthenticated()) {
      dispatch({ type: 'REFRESH_FAILURE' });
      return;
    }

    dispatch({ type: 'REFRESH_START' });

    try {
      const { admin, organization } = await apiClient.getCurrentAdmin();
      
      dispatch({
        type: 'REFRESH_SUCCESS',
        payload: { admin, organization },
      });
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      dispatch({ type: 'REFRESH_FAILURE' });
    }
  };

  // Check authentication on mount
  useEffect(() => {
    // Mock authentication disabled - require real login
    if (apiClient.isAuthenticated()) {
      refreshAuth();
    }
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;