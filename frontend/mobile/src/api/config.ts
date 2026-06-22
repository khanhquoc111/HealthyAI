// src/api/config.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Đổi IP này thành IP máy chạy backend khi test trên thiết bị thật
// Giữ nguyên 127.0.0.1 nếu test trên emulator Android (dùng 10.0.2.2)
export const API_BASE_URL = "http://10.10.126.75:8000"; // Android emulator
// export const API_BASE_URL = "http://localhost:8000"; // iOS simulator
// export const API_BASE_URL = "http://192.168.x.x:8000"; // Thiết bị thật

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Tự động đính kèm token vào mọi request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
