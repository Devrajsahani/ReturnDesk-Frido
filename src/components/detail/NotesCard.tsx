"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Banner } from "@/components/ui/Banner";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import type { NoteSummary } from "@/lib/domain/types";

const AUTHOR_STORAGE_KEY = "returndesk_author_name";

export interface NotesCardProps {
  reference: string;
  notes: NoteSummary[];
  onNoteAdded: () => void;
}

export function NotesCard({ reference, notes, onNoteAdded }: NotesCardProps) {
  const { showToast } = useToast();
  const [author, setAuthor] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(AUTHOR_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!body.trim()) {
      setError("Note text cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiFetch(`/api/requests/${reference}/notes`, {
        method: "POST",
        body: JSON.stringify({
          author: author.trim(),
          body: body.trim(),
        }),
      });

      // Save author for next time
      try {
        localStorage.setItem(AUTHOR_STORAGE_KEY, author.trim());
      } catch {
        // Ignore
      }

      setBody("");
      showToast(`Added note to ${reference}`, "success");
      onNoteAdded();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to add note. Check your connection and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="box p-5 space-y-5">
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <h2 className="font-display font-semibold text-base text-ink">
          Notes
        </h2>
        <span className="text-xs text-graphite font-sans tabular-nums">
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </span>
      </div>

      {/* Notes List (Oldest First) */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-xs text-graphite italic py-2">
            No notes recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-hairline">
            {notes.map((note) => (
              <div key={note.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink">{note.author}</span>
                  <span className="text-graphite tabular-nums">
                    {formatDateTime(note.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
                  {note.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Note Form */}
      <form onSubmit={handleSubmit} className="pt-4 border-t border-hairline space-y-3">
        <h3 className="text-xs font-semibold text-graphite">
          Add a note
        </h3>

        {error && (
          <Banner
            variant="danger"
            message={error}
          />
        )}

        <Textarea
          placeholder="Write a note about this customer request..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          aria-label="Note content"
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <Input
              placeholder="Your name"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              aria-label="Your name"
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Add note
          </Button>
        </div>
      </form>
    </div>
  );
}
