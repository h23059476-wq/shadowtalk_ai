type ChatAuthHeadersOptions = {
  accessToken?: string;
  fallbackKey?: string;
};

export function chatAuthHeaders({
  accessToken,
}: ChatAuthHeadersOptions): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}),
  };
}