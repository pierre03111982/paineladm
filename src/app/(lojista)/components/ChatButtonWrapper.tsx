"use client";

import { ChatButton } from "@/components/ai-chat/ChatButton";

type ChatButtonWrapperProps = {
  lojistaId: string;
};

/**
 * Wrapper client-side para o ChatButton
 * Necessário porque o layout é server-side
 */
export function ChatButtonWrapper({ lojistaId }: ChatButtonWrapperProps) {
  return <ChatButton lojistaId={lojistaId} />;
}



