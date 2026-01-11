"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Zod schema for creating a new record
const createFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  value: z.number().int('Value must be an integer'),
});

// Zod schema for updating a record (both fields optional, but at least one required)
const updateFormSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  value: z.number().int('Value must be an integer').optional(),
}).refine(
  (data) => data.name !== undefined || data.value !== undefined,
  {
    message: 'At least one field (name or value) must be provided',
  }
);

type CreateFormData = z.infer<typeof createFormSchema>;
type UpdateFormData = z.infer<typeof updateFormSchema>;

// Type for API response record
interface BonzaiRecord {
  id: string;
  name: string;
  value: number | null;
  created_at: string;
}

interface ApiResponse {
  success: boolean;
  data: BonzaiRecord[];
  error?: string;
}

export default function TestBonzaiPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fetch all records
  const { data, isLoading, error } = useQuery<ApiResponse>({
    queryKey: ['proplytics'],
    queryFn: async () => {
      const response = await fetch('/api/proplytics');
      if (!response.ok) {
        throw new Error('Failed to fetch');
      }
      return response.json();
    },
  });

  // Form setup for creating new records
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateFormData>({
    resolver: zodResolver(createFormSchema),
  });

  // Form setup for editing records
  const editForm = useForm<UpdateFormData>({
    resolver: zodResolver(updateFormSchema),
  });

  // Mutation for creating a new record
  const createMutation = useMutation({
    mutationFn: async (formData: CreateFormData) => {
      const response = await fetch('/api/proplytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create record');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch the query
      queryClient.invalidateQueries({ queryKey: ['proplytics'] });
      reset();
    },
  });

  // Mutation for updating a record
  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: UpdateFormData }) => {
      const response = await fetch(`/api/proplytics/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update record');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch the query
      queryClient.invalidateQueries({ queryKey: ['proplytics'] });
      setEditingId(null);
      editForm.reset();
    },
  });

  const onSubmit = (data: CreateFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: UpdateFormData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, formData: data });
    }
  };

  const handleEditClick = (record: BonzaiRecord) => {
    setEditingId(record.id);
    editForm.reset({
      name: record.name,
      value: record.value ?? undefined,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    editForm.reset();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Bonzai Test Page</h1>

      {/* Form */}
      <div className="mb-8 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">Create New Record</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block mb-1">Name:</label>
            <input
              type="text"
              {...register('name')}
              className="w-full px-3 py-2 border rounded"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block mb-1">Value:</label>
            <input
              type="number"
              {...register('value', { valueAsNumber: true })}
              className="w-full px-3 py-2 border rounded"
            />
            {errors.value && (
              <p className="text-red-500 text-sm mt-1">{errors.value.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {createMutation.isPending ? 'Submitting...' : 'Submit'}
          </button>

          {createMutation.isError && (
            <p className="text-red-500 text-sm">
              Error: {createMutation.error.message}
            </p>
          )}

          {createMutation.isSuccess && (
            <p className="text-green-500 text-sm">Record created successfully!</p>
          )}
        </form>
      </div>

      {/* Data Display */}
      <div className="p-4 border rounded">
        <h2 className="text-xl font-semibold mb-4">Records</h2>

        {isLoading && <p>Loading...</p>}

        {error && (
          <p className="text-red-500">Error loading data: {error.message}</p>
        )}

        {data?.error && (
          <p className="text-red-500">API Error: {data.error}</p>
        )}

        {data?.success && data.data && (
          <div className="space-y-2">
            {data.data.length === 0 ? (
              <p className="text-gray-500">No records found</p>
            ) : (
              <div className="space-y-2">
                {data.data.map((record) => (
                  <div
                    key={record.id}
                    className="p-3 bg-gray-50 rounded border"
                  >
                    {editingId === record.id ? (
                      // Edit form
                      <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-3">
                        <div>
                          <label className="block mb-1 text-sm">Name:</label>
                          <input
                            type="text"
                            {...editForm.register('name')}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                          {editForm.formState.errors.name && (
                            <p className="text-red-500 text-xs mt-1">
                              {editForm.formState.errors.name.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block mb-1 text-sm">Value:</label>
                          <input
                            type="number"
                            {...editForm.register('value', { valueAsNumber: true })}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                          {editForm.formState.errors.value && (
                            <p className="text-red-500 text-xs mt-1">
                              {editForm.formState.errors.value.message}
                            </p>
                          )}
                        </div>

                        {editForm.formState.errors.root && (
                          <p className="text-red-500 text-xs">
                            {editForm.formState.errors.root.message}
                          </p>
                        )}

                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={updateMutation.isPending}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:bg-gray-400"
                          >
                            {updateMutation.isPending ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={updateMutation.isPending}
                            className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500 disabled:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>

                        {updateMutation.isError && (
                          <p className="text-red-500 text-xs">
                            Error: {updateMutation.error.message}
                          </p>
                        )}
                      </form>
                    ) : (
                      // Display view
                      <div 
                        className="cursor-pointer"
                        onClick={() => handleEditClick(record)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{record.name}</p>
                            <p className="text-sm text-gray-600">
                              Value: {record.value ?? 'null'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Created: {new Date(record.created_at).toLocaleString()}
                            </p>
                          </div>
                          <p className="text-xs text-gray-400 font-mono">
                            {record.id.slice(0, 8)}...
                          </p>
                        </div>
                        <p className="text-xs text-blue-500 mt-2">Click to edit</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

