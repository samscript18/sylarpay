import axios from "axios";
export class ApiError extends Error {
	constructor(
		message: string,
		public status?: number,
		public code?: string,
	) {
		super(message);
		this.name = "ApiError";
	}
}
export const apiClient = axios.create({
	timeout: 45000,
	withCredentials: true,
	headers: { Accept: "application/json" },
});
export async function api<T>(url: string, body?: unknown, options?: { signal?: AbortSignal; timeout?: number }): Promise<T> {
	try {
		const response = await apiClient.request<T>({
			url,
			method: body === undefined ? "GET" : "POST",
			data: body,
			signal: options?.signal,
			timeout: options?.timeout,
		});
		return response.data;
	} catch (e) {
		if (axios.isAxiosError(e)) {
			const data = e.response?.data as { error?: string; code?: string } | undefined;
			throw new ApiError(
				data?.error ||
					(e.code === "ECONNABORTED"
						? "The server took too long to respond. Please try again."
						: e.response
							? "Request failed. Please try again."
							: "Cannot reach SylarPay. Check your connection and try again."),
				e.response?.status,
				data?.code || e.code,
			);
		}
		throw e;
	}
}
