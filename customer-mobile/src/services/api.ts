import { API_BASE_URL } from "../config/api";

export class ApiError extends Error {
  public code?: string;
  public status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        data?.message || data?.error || `Request failed with status ${response.status}`;
      throw new ApiError(message, data?.code, response.status);
    }

    return (data?.data !== undefined ? data.data : data) as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error.message || "Network request failed. Please check your connection.",
      "NETWORK_ERROR"
    );
  }
}
