import type React from "react";

type AlertStatus = "success" | "error";

type AlertProps = {
  status: AlertStatus;
  message: React.ReactNode;
  onClose?: () => void;
  actionLabel?: string;
  onAction?: () => void;
};

export function Alert({
  status,
  message,
  onClose,
  actionLabel,
  onAction,
}: AlertProps) {
  const colorClass =
    status === "success"
      ? "border-green-300 bg-green-50 text-green-800"
      : "border-red-300 bg-red-50 text-red-800";

  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-3 rounded border px-3 py-2 text-sm ${colorClass}`}
    >
      <span className="flex-1">{message}</span>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="text-xs text-inherit underline"
        >
          {actionLabel}
        </button>
      ) : null}
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="ml-auto text-xs text-inherit underline"
          aria-label="閉じる"
        >
          閉じる
        </button>
      ) : null}
    </div>
  );
}

