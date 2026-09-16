import type { ReactNode } from "react";
import "./ConnectionCard.css";

interface ConnectionCardProps {
  title: string;
  connected: boolean;
  detail?: string;
  children: ReactNode;
}

export function ConnectionCard({ title, connected, detail, children }: ConnectionCardProps) {
  return (
    <div className="connection-card">
      <div className="connection-card__header">
        <span className="connection-card__title">{title}</span>
        <span
          className={
            "connection-card__status " +
            (connected ? "connection-card__status--connected" : "connection-card__status--disconnected")
          }
        >
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>
      {detail && <p className="connection-card__detail">{detail}</p>}
      <div className="connection-card__actions">{children}</div>
    </div>
  );
}
