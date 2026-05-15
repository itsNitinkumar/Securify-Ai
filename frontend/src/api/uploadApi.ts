import axiosInstance from './axios';
import { ApiResponse } from '../types';

interface UploadResponse {
  id?: number;
  url?: string; // Legacy
  signedUrl?: string; // S3 signed URL
  imageKey?: string; // S3 key
  filename?: string;
  size?: number;
  caption?: string;
  mimeType?: string;
  originalName?: string;
}

interface StepImageData {
  id: number;
  stepId: number;
  imageKey: string;
  signedUrl: string;
  caption: string | null;
  mimeType: string | null;
  originalName: string | null;
  createdAt: string;
}

export const uploadApi = {
  /**
   * Upload step image to S3
   * @param file - Image file
   * @param findingId - Finding ID (optional for initial upload)
   * @param stepId - Step ID (optional for initial upload)
   * @param caption - Optional caption
   */
  uploadStepImage: async (
    file: File,
    findingId?: number,
    stepId?: number,
    caption?: string
  ): Promise<ApiResponse<UploadResponse>> => {
    const formData = new FormData();
    formData.append('image', file);
    if (caption) {
      formData.append('caption', caption);
    }
    if (findingId) {
      formData.append('findingId', findingId.toString());
    }
    if (stepId !== undefined) {
      formData.append('stepId', stepId.toString());
    }

    // Use new S3 endpoint if findingId and stepId are provided
    const endpoint = findingId && stepId !== undefined
      ? `/upload/findings/${findingId}/steps/${stepId}/image`
      : '/upload/step-image';

    const response = await axiosInstance.post<ApiResponse<UploadResponse>>(
      endpoint,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Get all step images for a finding
   * Returns images with signed URLs
   */
  getStepImages: async (findingId: number): Promise<ApiResponse<StepImageData[]>> => {
    const response = await axiosInstance.get<ApiResponse<StepImageData[]>>(
      `/findings/${findingId}/step-images`
    );
    return response.data;
  },

  /**
   * Delete step image
   * Removes from S3 and database
   */
  deleteStepImage: async (imageId: number): Promise<ApiResponse<void>> => {
    const response = await axiosInstance.delete<ApiResponse<void>>(
      `/step-images/${imageId}`
    );
    return response.data;
  },

  /**
   * Update image caption
   */
  updateImageCaption: async (imageId: number, caption: string): Promise<ApiResponse<any>> => {
    const response = await axiosInstance.patch<ApiResponse<any>>(
      `/step-images/${imageId}/caption`,
      { caption }
    );
    return response.data;
  },

  /**
   * Get signed URL for an S3 imageKey
   * Converts S3 key to temporary signed URL for display
   */
  getSignedUrl: async (imageKey: string): Promise<string> => {
    try {
      const response = await axiosInstance.post<ApiResponse<{ signedUrl: string }>>(
        '/upload/get-signed-url',
        { imageKey }
      );
      return response.data.data?.signedUrl || imageKey;
    } catch (error) {
      console.error('Failed to get signed URL:', error);
      return imageKey; // Fallback to imageKey
    }
  },
};
