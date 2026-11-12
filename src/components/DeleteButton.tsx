"use client";
import { useState, useTransition } from "react";

export function DeleteButton({ onDelete, label = "Delete" }: { onDelete: () => Promise<void>; label?: string }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={`btn btn-sm ${armed ? "btn-danger" : "btn-ghost"}`}
      disabled={pending}
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (!armed) return setArmed(true);
        start(() => onDelete());
      }}
    >
      {pending ? "Deleting…" : armed ? "Confirm" : label}
    </button>
  );
}
