export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || "予期しないエラーが発生しました";
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  return "予期しないエラーが発生しました";
}

