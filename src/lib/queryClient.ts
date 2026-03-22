import { QueryClient } from '@tanstack/react-query'

function getRetryDelay(attempt: number): number {
  const baseDelayMs = 600
  const maxDelayMs = 6000
  return Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt - 1))
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15000,
      gcTime: 300000,
      refetchOnWindowFocus: false,
      retry: (failureCount) => failureCount < 2,
      retryDelay: getRetryDelay
    },
    mutations: {
      retry: 0
    }
  }
})
