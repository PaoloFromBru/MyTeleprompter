export type ToastVariant = "success" | "error" | "info";

export function toast(message: string, variant: ToastVariant = "info") {
  if (typeof window === "undefined") return;
  const event = new CustomEvent("app:toast", { detail: { msg: message, variant } });
  window.dispatchEvent(event);
}

