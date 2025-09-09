import { createSlice, PayloadAction, type Slice } from '@reduxjs/toolkit';
import type { Profile } from '../schemas';

export interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  isEditing: boolean;
  avatarUploadProgress: number;
}

const initialState: ProfileState = {
  profile: null,
  isLoading: false,
  error: null,
  isEditing: false,
  avatarUploadProgress: 0,
};

export const profileSlice: Slice<ProfileState> = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<Profile>) => {
      state.profile = action.payload;
    },
    updateProfile: (state, action: PayloadAction<Partial<Profile>>) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setIsEditing: (state, action: PayloadAction<boolean>) => {
      state.isEditing = action.payload;
    },
    setAvatarUploadProgress: (state, action: PayloadAction<number>) => {
      state.avatarUploadProgress = action.payload;
    },
    clearProfile: (state) => {
      state.profile = null;
      state.error = null;
      state.isEditing = false;
      state.avatarUploadProgress = 0;
    },
  },
});

export const {
  setProfile,
  updateProfile,
  setLoading,
  setError,
  setIsEditing,
  setAvatarUploadProgress,
  clearProfile,
} = profileSlice.actions;

export default profileSlice.reducer;
