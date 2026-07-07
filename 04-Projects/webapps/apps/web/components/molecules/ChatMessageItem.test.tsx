import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatMessageItem } from "./ChatMessageItem";

describe("ChatMessageItem", () => {
  it("renders the sender and content", () => {
    render(<ChatMessageItem senderUsername="alice" content="hello" isOwnMessage={false} />);

    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("applies own-message styling when isOwnMessage is true", () => {
    render(<ChatMessageItem senderUsername="alice" content="hi" isOwnMessage={true} />);

    expect(screen.getByText("hi").closest("div")).toHaveClass("ml-auto");
  });
});
