"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Influencer, VideoTemplate } from "@/lib/types";
import { usePersonaStore } from "@/lib/store";
import { generateId, cn } from "@/lib/utils";
import { TEMPLATES, TEMPLATE_PLACEHOLDERS } from "@/lib/constants";
import { simulateGeneration } from "@/lib/mock-generation";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GenerateViewProps {
  influencer: Influencer;
}

type GenerationState =
  | { phase: "idle" }
  | { phase: "generating"; stageLabel: string; progress: number }
  | {
      phase: "done";
      videoId: string;
      consistencyScore: number;
      gradient: string;
    }
  | { phase: "failed"; reason: string };

export function GenerateView({ influencer }: GenerateViewProps) {
  const addVideo = usePersonaStore((s) => s.addVideo);
  const updateVideo = usePersonaStore((s) => s.updateVideo);
  const setActiveView = usePersonaStore((s) => s.setActiveView);

  const [template, setTemplate] = useState<VideoTemplate | null>(null);
  const [scene, setScene] = useState("");
  const [duration, setDuration] = useState<number[]>([10]);
  const [resolution, setResolution] = useState<"720p" | "1080p" | "4k">(
    "1080p"
  );
  const [genState, setGenState] = useState<GenerationState>({ phase: "idle" });
  const cancelRef = useRef<(() => void) | null>(null);

  const acceptedRefs = influencer.referenceImages.filter(
    (r) => r.status === "accepted"
  );
  const hasRefs = acceptedRefs.length >= 3;
  const canGenerate = hasRefs && template !== null && scene.trim().length > 0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelRef.current?.();
    };
  }, []);

  const getDisabledReason = () => {
    if (!hasRefs) return "Upload at least 3 reference images first";
    if (!template) return "Select a video format";
    if (!scene.trim()) return "Enter a scene description";
    return null;
  };

  const handleGenerate = useCallback(() => {
    if (!canGenerate || !template) return;

    const videoId = generateId();

    addVideo(influencer.id, {
      id: videoId,
      influencerId: influencer.id,
      prompt: scene,
      template,
      duration: duration[0],
      resolution,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    setGenState({ phase: "generating", stageLabel: "", progress: 0 });

    cancelRef.current = simulateGeneration(
      (stageLabel, progress) => {
        setGenState({ phase: "generating", stageLabel, progress });
      },
      (result) => {
        updateVideo(influencer.id, videoId, {
          status: "ready",
          consistencyScore: result.consistencyScore,
          thumbnailGradient: result.thumbnailGradient,
        });
        setGenState({
          phase: "done",
          videoId,
          consistencyScore: result.consistencyScore ?? 0.9,
          gradient:
            result.thumbnailGradient ||
            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        });
      },
      (reason) => {
        updateVideo(influencer.id, videoId, {
          status: "failed",
          failureReason: reason,
        });
        setGenState({ phase: "failed", reason });
      }
    );
  }, [
    canGenerate,
    template,
    scene,
    duration,
    resolution,
    influencer.id,
    addVideo,
    updateVideo,
  ]);

  const handleRetry = () => {
    setGenState({ phase: "idle" });
  };

  return (
    <div className="px-6 py-4 max-w-[600px] mx-auto space-y-6">
      {/* Format selector */}
      <div>
        <Label className="text-[0.625rem] uppercase tracking-widest text-muted-foreground">
          Format
        </Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTemplate(t.value)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm transition-colors duration-150 border",
                template === t.value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground/30"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scene description */}
      <div>
        <Label className="text-[0.625rem] uppercase tracking-widest text-muted-foreground">
          Scene description
        </Label>
        <Textarea
          value={scene}
          onChange={(e) => setScene(e.target.value)}
          placeholder={
            template
              ? TEMPLATE_PLACEHOLDERS[template]
              : "Select a format first..."
          }
          className="mt-2 min-h-[100px] resize-none text-sm"
        />
      </div>

      {/* Parameters */}
      <div className="flex gap-8">
        <div className="flex-1">
          <Label className="text-[0.625rem] uppercase tracking-widest text-muted-foreground">
            Duration
          </Label>
          <div className="flex items-center gap-3 mt-2">
            <Slider
              value={duration}
              onValueChange={(v) => setDuration(Array.isArray(v) ? [...v] : [v])}
              min={5}
              max={60}
              step={5}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-8 text-right">
              {duration[0]}s
            </span>
          </div>
        </div>
        <div className="w-36">
          <Label className="text-[0.625rem] uppercase tracking-widest text-muted-foreground">
            Resolution
          </Label>
          <Select
            value={resolution}
            onValueChange={(v) =>
              setResolution(v as "720p" | "1080p" | "4k")
            }
          >
            <SelectTrigger className="mt-2 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="720p">720p</SelectItem>
              <SelectItem value="1080p">1080p</SelectItem>
              <SelectItem value="4k">4K</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Generate / Progress / Result */}
      {genState.phase === "idle" && !canGenerate && (
        <Tooltip>
          <TooltipTrigger render={<div />}>
            <Button disabled className="w-full pointer-events-none">
              Generate video
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getDisabledReason()}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {genState.phase === "idle" && canGenerate && (
        <Button onClick={handleGenerate} className="w-full">
          Generate video
        </Button>
      )}

      {genState.phase === "generating" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{genState.stageLabel}</p>
          <Progress value={genState.progress} className="h-1" />
        </div>
      )}

      {genState.phase === "done" && (
        <div className="space-y-4">
          <div className="border border-border rounded-md overflow-hidden">
            <div
              className="aspect-video"
              style={{ background: genState.gradient }}
            />
            <div className="p-4 space-y-2">
              <p className="text-sm truncate">{scene}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{duration[0]}s</span>
                <span>{resolution}</span>
                <span>
                  Consistency: {(genState.consistencyScore * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="text-sm"
              onClick={() => setActiveView("profile")}
            >
              View in Posts
            </Button>
            <Button
              variant="ghost"
              className="text-sm"
              onClick={() => setGenState({ phase: "idle" })}
            >
              Generate another
            </Button>
          </div>
        </div>
      )}

      {genState.phase === "failed" && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-status-failed)]">
            {genState.reason}
          </p>
          <Button onClick={handleRetry} className="w-full">
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
