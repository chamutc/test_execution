import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsAPI } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

// Query keys
export const sessionKeys = {
  all: ['sessions'],
  lists: () => [...sessionKeys.all, 'list'],
  list: (filters) => [...sessionKeys.lists(), { filters }],
  details: () => [...sessionKeys.all, 'detail'],
  detail: (id) => [...sessionKeys.details(), id],
  byStatus: (status) => [...sessionKeys.all, 'status', status],
  byPriority: (priority) => [...sessionKeys.all, 'priority', priority],
};

// Get all sessions
export const useSessionsQuery = (options = {}) => {
  return useQuery({
    queryKey: sessionKeys.lists(),
    queryFn: async () => {
      try {
        const response = await sessionsAPI.getAll();
        return response.data;
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
        // Return empty array on error to prevent crashes
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000,
    ...options,
  });
};

// Get session by ID
export const useSessionQuery = (id, options = {}) => {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: async () => {
      const response = await sessionsAPI.getById(id);
      return response.data;
    },
    enabled: !!id,
    ...options,
  });
};

// Get sessions by status
export const useSessionsByStatusQuery = (status, options = {}) => {
  return useQuery({
    queryKey: sessionKeys.byStatus(status),
    queryFn: async () => {
      const response = await sessionsAPI.getByStatus(status);
      return response.data;
    },
    enabled: !!status,
    ...options,
  });
};

// Get sessions by priority
export const useSessionsByPriorityQuery = (priority, options = {}) => {
  return useQuery({
    queryKey: sessionKeys.byPriority(priority),
    queryFn: async () => {
      const response = await sessionsAPI.getByPriority(priority);
      return response.data;
    },
    enabled: !!priority,
    ...options,
  });
};

// Create session mutation
export const useCreateSessionMutation = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: async (sessionData) => {
      const response = await sessionsAPI.create(sessionData);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch sessions
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      showSuccess('Session created successfully');
    },
    onError: (error) => {
      showError(`Failed to create session: ${error.response?.data?.message || error.message}`);
    },
  });
};

// Update session mutation
export const useUpdateSessionMutation = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await sessionsAPI.update(id, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Update the specific session in cache
      queryClient.setQueryData(sessionKeys.detail(variables.id), data);
      // Invalidate sessions list
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      showSuccess('Session updated successfully');
    },
    onError: (error) => {
      showError(`Failed to update session: ${error.response?.data?.message || error.message}`);
    },
  });
};

// Delete session mutation
export const useDeleteSessionMutation = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: async (id) => {
      const response = await sessionsAPI.delete(id);
      return response.data;
    },
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: sessionKeys.detail(id) });
      // Invalidate sessions list
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      showSuccess('Session deleted successfully');
    },
    onError: (error) => {
      showError(`Failed to delete session: ${error.response?.data?.message || error.message}`);
    },
  });
};
