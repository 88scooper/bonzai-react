import { z } from 'zod';

/**
 * Schema for bulk upload form data
 */
export const bulkUploadFormSchema = z.object({
  file: z.instanceof(File, { message: 'File is required' })
    .refine((file) => {
      const allowedExtensions = ['csv', 'xlsx', 'xls'];
      const extension = file.name.toLowerCase().split('.').pop();
      return extension && allowedExtensions.includes(extension);
    }, 'Invalid file type. Please upload a CSV or Excel file.')
    .refine((file) => file.size <= 5 * 1024 * 1024, 'File size must not exceed 5MB'),
  accountId: z.string().uuid('Invalid account ID').optional(),
});

export type BulkUploadFormInput = z.infer<typeof bulkUploadFormSchema>;
