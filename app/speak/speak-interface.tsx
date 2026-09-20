"use client";

import { VoiceVisualizer } from "@/components/speak/voice-visualizer";
import { VoiceControls } from "@/components/speak/voice-controls";
import { VoiceTranscript } from "@/components/speak/voice-transcript";
import useVoiceSession from "@/hooks/use-voice-session";
import { CriterionBranding } from "@/components/criterion-branding";
import { AiNotice } from "@/components/ai-notice";

export function SpeakInterface() {
  const {
    status,
    isSessionActive,
    currentVolume,
    conversation,
    handleStartStopClick,
    toolExecutionStatus,
  } = useVoiceSession();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <CriterionBranding />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:py-16">
        <div className="w-full max-w-3xl mx-auto space-y-8">
          <VoiceVisualizer
            isActive={isSessionActive}
            volume={currentVolume}
            toolExecutionStatus={toolExecutionStatus}
          />

          <VoiceControls
            isSessionActive={isSessionActive}
            onClick={handleStartStopClick}
            status={status}
            toolExecutionStatus={toolExecutionStatus}
          />

          <VoiceTranscript conversation={conversation} />

          <AiNotice />
        </div>
      </main>
    </div>
  );
}
