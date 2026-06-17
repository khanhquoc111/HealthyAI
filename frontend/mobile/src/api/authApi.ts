// src/api/authApi.js
import api from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const login = async (tenDangNhap: string, password: string) => {
  const res = await api.post("/auth/login", { tenDangNhap, password });
  await AsyncStorage.setItem("token", res.data.access_token);
  await AsyncStorage.setItem("userName", res.data.tenDangNhap);
  return res.data;
};

export const register = async (formData: Record<string, any>) => {
  const res = await api.post("/auth/register", formData);
  return res.data;
};

export const logout = async () => {
  await AsyncStorage.removeItem("token");
  await AsyncStorage.removeItem("userName");
};

export const getStoredUser = async () => {
  return await AsyncStorage.getItem("userName");
};
