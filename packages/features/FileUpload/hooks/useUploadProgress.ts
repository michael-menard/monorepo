import { useState, useCallback } from 'react';
import { UploadProgress, UploadProgressSchema } from '../schemas';

export interface UploadProgressState {
  progress: Map<File, UploadProgress>;
  overallProgress: number;
  isUploading: boolean;
  completedFiles: number;
  totalFiles: number;
}

export interface UploadProgressActions {
  startUpload: (files: File[]) => void;
  updateProgress: (file: File, progress: number, status?: UploadProgress['status'], error?: string) => void;
  completeUpload: (file: File) => void;
  failUpload: (file: File, error: string) => void;
  resetProgress: () => void;
  getFileProgress: (file: File) => UploadProgress | undefined;
}

export const useUploadProgress = () => {
  const [state, setState] = useState<UploadProgressState>({
    progress: new Map(),
    overallProgress: 0,
    isUploading: false,
    completedFiles: 0,
    totalFiles: 0,
  });

  const startUpload = useCallback((files: File[]) => {
    const initialProgress = new Map<File, UploadProgress>();
    
    files.forEach(file => {
      const progress: UploadProgress = {
        file,
        progress: 0,
        status: 'pending',
      };
      
      // Validate with Zod schema
      const validated = UploadProgressSchema.parse(progress);
      initialProgress.set(file, validated);
    });

    setState({
      progress: initialProgress,
      overallProgress: 0,
      isUploading: true,
      completedFiles: 0,
      totalFiles: files.length,
    });
  }, []);

  const updateProgress = useCallback((
    file: File, 
    progress: number, 
    status: UploadProgress['status'] = 'uploading',
    error?: string
  ) => {
    setState(prev => {
      const newProgress = new Map(prev.progress);
      const currentFileProgress = newProgress.get(file);
      
      if (currentFileProgress) {
        const updatedProgress: UploadProgress = {
          file,
          progress: Math.min(100, Math.max(0, progress)),
          status,
          error,
        };
        
        // Validate with Zod schema
        const validated = UploadProgressSchema.parse(updatedProgress);
        newProgress.set(file, validated);
      }

      // Calculate overall progress
      let totalProgress = 0;
      let completedCount = 0;
      
      newProgress.forEach(fileProgress => {
        totalProgress += fileProgress.progress;
        if (fileProgress.status === 'completed') {
          completedCount++;
        }
      });

      const overallProgress = newProgress.size > 0 ? totalProgress / newProgress.size : 0;

      return {
        ...prev,
        progress: newProgress,
        overallProgress,
        completedFiles: completedCount,
        isUploading: completedCount < prev.totalFiles,
      };
    });
  }, []);

  const completeUpload = useCallback((file: File) => {
    updateProgress(file, 100, 'completed');
  }, [updateProgress]);

  const failUpload = useCallback((file: File, error: string) => {
    updateProgress(file, 0, 'error', error);
  }, [updateProgress]);

  const resetProgress = useCallback(() => {
    setState({
      progress: new Map(),
      overallProgress: 0,
      isUploading: false,
      completedFiles: 0,
      totalFiles: 0,
    });
  }, []);

  const getFileProgress = useCallback((file: File) => {
    return state.progress.get(file);
  }, [state.progress]);

  return {
    state,
    actions: {
      startUpload,
      updateProgress,
      completeUpload,
      failUpload,
      resetProgress,
      getFileProgress,
    },
  };
}; 