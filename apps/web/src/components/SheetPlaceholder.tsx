import type { ReactNode } from "react";

type SheetPlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
};

/** Contenedor temporal: no simula funcionalidades que todavía no existen. */
export default function SheetPlaceholder({ eyebrow, title, description, actionLabel, onAction, children }: SheetPlaceholderProps) {
  return (
    <div className="sheet-placeholder panel">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
      {actionLabel && onAction && (
        <button type="button" className="sheet-placeholder-action" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
