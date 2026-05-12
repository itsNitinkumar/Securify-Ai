import axiosInstance from './axios';
import { ApiResponse } from '../types';

interface UploadResponse {
  url: string;
  filename: string;
  size: number;
}

export const uploadApi = {
  // Upload image file
  uploadStepImage: async (file: File): Promise<ApiResponse<UploadResponse>> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await axiosInstance.post<ApiResponse<UploadResponse>>(
      '/upload/step-image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Upload base64 image
  uploadStepImageBase64: async (base64Image: string): Promise<ApiResponse<UploadResponse>> => {
    const response = await axiosInstance.post<ApiResponse<UploadResponse>>(
      '/upload/step-image-base64',
      { image: base64Image }
    );
    return response.data;
  },
};
