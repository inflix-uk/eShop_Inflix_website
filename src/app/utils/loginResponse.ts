/**
 * Login success check compatible with legacy JSON `status: 201` and new HTTP 200 + `success: true`.
 */
export function isFetchLoginSuccess(response: Response, data: Record<string, unknown> | null) {
  if (!data) return false;
  return (response.ok && data.success === true) || data.status === 201;
}

export function getFetchLoginErrorMessage(
  response: Response,
  data: Record<string, unknown> | null,
  fallback = "Login failed. Please try again."
) {
  const message = typeof data?.message === "string" ? data.message : "";
  if (message) return message;
  if (response.status === 429) return "Too many login attempts. Please try again later.";
  if (response.status === 401) return "Invalid email or password";
  return fallback;
}
