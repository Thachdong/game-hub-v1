"use client";

import { useEffect, useState } from "react";
import type { ChatMessage } from "@game-hub/caro-service";
import { Button } from "@/components/atoms/Button";
import { ChatMessageItem } from "@/components/molecules/ChatMessageItem";
import { RequireSignIn } from "@/components/molecules/RequireSignIn";
import { useAuthSession } from "@/components/templates/Providers";
import { listMatchChatAction, sendMatchChatAction } from "@/lib/actions/caro";
import { useCaroRealtimeEvent } from "@/lib/useCaroRealtime";

/**
 * Message history (guest-readable, FR-010) + a send input gated by sign-in only (FR-015) — not
 * participant status, unlike Start/Draw/Surrender/Move/kick. Fetches history on mount and
 * live-appends new messages via `match:chat` (FR-017).
 */
export function ChatBox({
  matchId,
  resolveSenderUsername,
}: {
  matchId: string;
  resolveSenderUsername: (senderId: string) => string;
}) {
  const { account } = useAuthSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState("");

  useEffect(() => {
    let cancelled = false;
    listMatchChatAction(matchId).then((result) => {
      if (!cancelled && result.ok) setMessages(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  useCaroRealtimeEvent<ChatMessage>(
    "match:chat",
    (message) => {
      setMessages((current) => [...current, message]);
    },
    matchId
  );

  function handleSend() {
    if (!content.trim()) return;
    const value = content;
    setContent("");
    void sendMatchChatAction({ matchId, content: value });
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
        {messages.map((message) => (
          <ChatMessageItem
            key={message.id}
            senderUsername={resolveSenderUsername(message.senderId)}
            content={message.content}
            isOwnMessage={message.senderId === account?.id}
          />
        ))}
      </div>
      <RequireSignIn onAction={handleSend}>
        {({ onClick }) => (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onClick();
            }}
            className="flex gap-2"
          >
            <input
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Say something…"
              aria-label="Chat message"
              className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-sm text-[var(--color-text-primary)]"
            />
            <Button type="submit">Send</Button>
          </form>
        )}
      </RequireSignIn>
    </div>
  );
}
