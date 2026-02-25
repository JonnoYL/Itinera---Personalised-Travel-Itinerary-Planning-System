import axios, { AxiosError } from "axios";

export type AuthResponse = {
  token: string;
  user_id: number;
};

type SignupErrorResponse = {
  detail?: unknown;
};

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

// NOTE: All HTTP calls are commented out during development to avoid backend dependency.
// Replace dummy implementations below when the backend is ready.

export async function signUpWithUsernamePassword(
  username: string,
  password: string,
): Promise<AuthResponse | null> {
  try {
    const { data } = await axios.post<AuthResponse>(`${BASE_URL}/auth/signup`, {
      username,
      password,
    });
    return data;
  } catch (err) {
    const axiosError = err as AxiosError<SignupErrorResponse>;
    const status = axiosError.response?.status;
    const detail = axiosError.response?.data?.detail;

    // 400: username already exists -> "Username is taken"
    if (status === 400 && detail === "Username already exists") {
      return null;
    }

    // 422: validation error (e.g. blank username) -> let caller decide
    if (status === 422) {
      throw axiosError;
    }

    // Other errors: return null so caller can handle/log
    return null;
  }
}

export async function loginWithUsernamePassword(
  username: string,
  password: string,
): Promise<AuthResponse | null> {
  try {
    const { data } = await axios.post<AuthResponse>(`${BASE_URL}/auth/login`, {
      username,
      password,
    });
    return data;
  } catch (err) {
    const axiosError = err as AxiosError<{ detail: string }>;
    if (
      axiosError.response?.status === 400 &&
      axiosError.response.data.detail === "No such username"
    ) {
      return null;
    }
  }
  return null;
}

export async function signupWithEmailPassword(): Promise<AuthResponse> {
  // const { data } = await axios.post<AuthResponse>(`${BASE_URL}/auth/signup`, { email, password });
  // return data;
  await new Promise((resolve) => setTimeout(resolve, 600));
  return {
    token: "dev-token-signup-123",
    user_id: 1,
  };
}

export async function requestPasswordReset(): Promise<{ ok: boolean }> {
  // await axios.post(`${BASE_URL}/auth/forgot-password`, { email });
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { ok: true };
}

export async function getHelp(): Promise<{ url: string }> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return { url: "https://example.com/help" };
}
