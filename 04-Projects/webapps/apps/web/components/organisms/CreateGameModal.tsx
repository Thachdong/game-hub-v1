"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/atoms/Button";
import { Modal } from "@/components/molecules/Modal";
import { formatGameType } from "@/lib/gameType";
import { createMatchAction } from "@/lib/actions/caro";
import type { GameConfig } from "@game-hub/caro-service";

export interface CreatedMatch {
  id: string;
  configId: string;
  boardSize: string;
  moveTimeSeconds: number;
  visibility: string;
  status: string;
  creatorId: string;
  createdAt: string;
}

export function CreateGameModal({
  gameConfigs,
  onClose,
  onCreated,
}: {
  gameConfigs: GameConfig[];
  onClose: () => void;
  onCreated: (match: CreatedMatch) => void;
}) {
  const [configId, setConfigId] = useState(gameConfigs[0]?.id ?? "");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!configId) return;

    setSubmitting(true);
    const result = await createMatchAction({ configId, visibility });
    setSubmitting(false);

    if (result.ok) {
      onCreated(result.data);
      onClose();
    }
  }

  return (
    <Modal onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Create Game</h2>

        <label className="flex flex-col gap-1 text-sm text-[var(--color-text-secondary)]">
          Game type
          <select
            value={configId}
            onChange={(event) => setConfigId(event.target.value)}
            className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-text-primary)]"
          >
            {gameConfigs.map((config) => (
              <option key={config.id} value={config.id}>
                {formatGameType(config.boardSize, config.moveTimeSeconds)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-[var(--color-text-secondary)]">
          Visibility
          <select
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as "public" | "private")}
            className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-text-primary)]"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </label>

        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !configId}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
