import axios from "axios";
import { BackendItinerary, BackendPOI } from "./types";
import type { AxiosError } from "axios";

const { EXPO_PUBLIC_API_URL } = process.env as { EXPO_PUBLIC_API_URL?: string };
export const BASE_URL = EXPO_PUBLIC_API_URL || "http://localhost:8000";

export async function apiGetItinerary(
  id: number,
): Promise<BackendItinerary | null> {
  try {
    const { data } = await axios.get(`${BASE_URL}/itineraries/${id}`);
    return data as BackendItinerary;
  } catch {
    return null;
  }
}

export async function apiGetPOIs(): Promise<BackendPOI[]> {
  try {
    const { data } = await axios.get(`${BASE_URL}/pois`);
    console.log(
      "/pois loaded",
      Array.isArray(data) ? data.length : 0,
      "from",
      BASE_URL,
    );
    return data as BackendPOI[];
  } catch (e) {
    const err = e as unknown as {
      response?: { status?: number };
      message?: string;
    };
    console.log(
      "/pois failed",
      err?.response?.status,
      err?.message,
      "from",
      BASE_URL,
    );
    return [];
  }
}

export async function apiGetPoiCategories(): Promise<string[]> {
  try {
    const { data } = await axios.get(`${BASE_URL}/pois/categories`);
    if (Array.isArray(data)) return data as string[];
    return [];
  } catch (e) {
    const err = e as { response?: { status?: number }; message?: string };
    console.log(
      "/pois/categories failed",
      err?.response?.status,
      err?.message,
      "from",
      BASE_URL,
    );
    return [];
  }
}

export async function apiUpdateItinerary(
  id: number,
  update: Partial<{ start_time: string; end_time: string; budget: number }>,
): Promise<boolean> {
  try {
    const payload: Record<string, unknown> = {};
    if (typeof update.start_time === "string")
      payload.start_time = update.start_time;
    if (typeof update.end_time === "string") payload.end_time = update.end_time;
    if (typeof update.budget === "number") payload.budget = update.budget;
    const { data } = await axios.patch(
      `${BASE_URL}/itineraries/${id}`,
      payload,
    );
    console.log("patch /itineraries/", id, "->", data);
    return true;
  } catch (err) {
    const e = err as AxiosError;
    console.log("patch failed", e.response?.status, e.response?.data);
    return false;
  }
}

export async function apiGenerateItinerary(
  id: number,
): Promise<BackendItinerary | null> {
  try {
    const first = await axios
      .post(`${BASE_URL}/itineraries/${id}/generate`)
      .then((r) => r.data as BackendItinerary)
      .catch((err: AxiosError) => {
        console.log(
          "generate (slash) failed",
          err.response?.status,
          err.response?.data,
        );
        if (err.response?.status === 404) return null;
        throw err;
      });
    if (first) return first;
    const { data } = await axios.post(`${BASE_URL}/itineraries${id}/generate`);
    return data as BackendItinerary;
  } catch (err) {
    const e = err as AxiosError | Error;
    console.log(
      "generate failed",
      (e as AxiosError).response?.status,
      (e as AxiosError).response?.data || (e as Error).message,
    );
    return null;
  }
}

export async function apiGetItineraries(
  token?: string | null,
): Promise<BackendItinerary[]> {
  try {
    const { data } = await axios.get(`${BASE_URL}/itineraries/user`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return data as BackendItinerary[];
  } catch {
    return [];
  }
}

export async function apiGetUserById(
  userId: number,
): Promise<{ user_id: number; username: string } | null> {
  try {
    const { data } = await axios.get(`${BASE_URL}/users/${userId}`);
    return data as { user_id: number; username: string };
  } catch {
    return null;
  }
}

export async function apiDeleteItinerary(id: number): Promise<boolean> {
  try {
    await axios.delete(`${BASE_URL}/itineraries/${id}`);
    return true;
  } catch (err) {
    console.error("Failed to delete itinerary", err);
    return false;
  }
}
