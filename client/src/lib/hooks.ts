import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type SearchProofsParams, type CreateProofPayload } from './api';

export function useProofs(params: SearchProofsParams = {}) {
  return useQuery({
    queryKey: ['proofs', params],
    queryFn: () => api.searchProofs(params),
  });
}

export function useProofById(id: string) {
  return useQuery({
    queryKey: ['proof', id],
    queryFn: () => api.getProofById(id),
    enabled: !!id,
  });
}

export function useCreateProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, data }: { file: File; data: CreateProofPayload }) =>
      api.createProof(file, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
    },
  });
}

export function useUpdateProofStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateProofStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proofs'] });
      queryClient.invalidateQueries({ queryKey: ['proof', data.proof_id] });
    },
  });
}
