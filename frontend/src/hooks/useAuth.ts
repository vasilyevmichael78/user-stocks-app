import { useAuthStore } from '../stores/authStore';

/**
 * Hook to check if user is authenticated and ready for API calls
 * This ensures API calls are only made after authentication is confirmed
 */
export const useIsAuthenticated = () => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated;
};

/**
 * Hook to get current user
 */
export const useCurrentUser = () => {
  const { user } = useAuthStore();
  return user;
};

/**
 * Hook for auth actions
 */
export const useAuthActions = () => {
  const { login, register, logout, clearError } = useAuthStore();
  return { login, register, logout, clearError };
};
