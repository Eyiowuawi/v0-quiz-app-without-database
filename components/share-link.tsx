"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { getQuizJoinUrl } from "@/lib/join-url";

interface ShareLinkProps {
  /** Full URL to copy (optional if `teamId` is set). */
  url?: string;
  /** Builds join URL using `NEXT_PUBLIC_APP_URL` or current origin. */
  teamId?: string;
}

export function ShareLink({ url, teamId }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (url) {
      setShareUrl(url);
      return;
    }
    if (teamId) {
      setShareUrl(getQuizJoinUrl(teamId));
      return;
    }
    setShareUrl(
      typeof window !== "undefined" ? window.location.origin : "",
    );
  }, [url, teamId]);

  const handleCopy = async () => {
    if (!shareUrl) {
      toast.error("Link not ready yet");
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Button
      onClick={handleCopy}
      variant="outline"
      size="sm"
      className="gap-2"
      type="button"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Copy link
        </>
      )}
    </Button>
  );
}
