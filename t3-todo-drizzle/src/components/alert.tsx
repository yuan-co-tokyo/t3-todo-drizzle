type AlertStatus = "success" | "error";

type AlertProps = {
  status: AlertStatus;
  message: string;
  onClose?: () => void;
};

export function Alert({ status, message, onClose }: AlertProps) {
  const colorClass =
    status === "success"
      ? "border-green-300 bg-green-50 text-green-800"
      : "border-red-300 bg-red-50 text-red-800";

  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-3 rounded border px-3 py-2 text-sm ${colorClass}`}
    >
      <span>{message}</span>
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

