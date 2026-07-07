/** One chat bubble (data-model.md "ChatMessageView"), styled differently for the viewer's own messages. */
export function ChatMessageItem({
  senderUsername,
  content,
  isOwnMessage,
}: {
  senderUsername: string;
  content: string;
  isOwnMessage: boolean;
}) {
  return (
    <div
      className={`flex max-w-[85%] flex-col gap-0.5 rounded px-2 py-1 text-sm ${
        isOwnMessage
          ? "ml-auto items-end bg-[var(--color-accent)] text-[var(--color-background)]"
          : "items-start bg-[var(--color-surface)] text-[var(--color-text-primary)]"
      }`}
    >
      <span className="text-xs opacity-70">{senderUsername}</span>
      <span className="break-words">{content}</span>
    </div>
  );
}
