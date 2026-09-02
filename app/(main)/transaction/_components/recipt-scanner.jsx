"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import NextImage from "next/image";
import {
  Camera,
  Loader2,
  Upload,
  Sparkles,
  CheckCircle2,
  IndianRupee,
  Calendar,
  Tag,
  Store,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { scanReceipt } from "@/actions/transaction";
import { getCategoryById } from "@/lib/receipt-utils";
import { cn } from "@/lib/utils";

const STEPS = {
  idle: "idle",
  compressing: "compressing",
  scanning: "scanning",
  done: "done",
};

async function compressImage(file, maxWidth = 1024, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = document.createElement("img");

      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Could not compress image"));
              return;
            }

            resolve(
              new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
                type: "image/jpeg",
              })
            );
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => reject(new Error("Invalid image file"));
      img.src = event.target.result;
    };

    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function ReceiptScanner({ onScanComplete }) {
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const dragDepthRef = useRef(0);
  const [step, setStep] = useState(STEPS.idle);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const resetScanner = useCallback(() => {
    setStep(STEPS.idle);
    setResult(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [previewUrl]);

  const processFile = useCallback(
    async (file) => {
      if (!file?.type?.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        toast.error("Image must be under 8MB");
        return;
      }

      setResult(null);
      setScanError(null);
      setStep(STEPS.compressing);
      setIsLoading(true);

      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      try {
        const compressed = await compressImage(file);
        setStep(STEPS.scanning);

        const scanned = await scanReceipt(compressed);

        setResult(scanned);
        setStep(STEPS.done);
        onScanComplete(scanned);
        toast.success("Receipt scanned — fields auto-filled");
      } catch (err) {
        setStep(STEPS.idle);
        setScanError(err);
        toast.error(err?.message || "Failed to scan receipt");
      } finally {
        setIsLoading(false);
      }
    },
    [onScanComplete]
  );

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    const preventBrowserDrop = (event) => {
      if (event.dataTransfer?.types?.includes("Files")) event.preventDefault();
    };
    const handleDragEnter = (event) => {
      preventBrowserDrop(event);
      dragDepthRef.current += 1;
      setIsDragging(true);
    };
    const handleDragOver = (event) => {
      preventBrowserDrop(event);
      event.dataTransfer.dropEffect = "copy";
      setIsDragging(true);
    };
    const handleDragLeave = (event) => {
      preventBrowserDrop(event);
      dragDepthRef.current -= 1;
      if (dragDepthRef.current <= 0) {
        dragDepthRef.current = 0;
        setIsDragging(false);
      }
    };

    window.addEventListener("dragover", preventBrowserDrop);
    window.addEventListener("drop", preventBrowserDrop);
    dropZone.addEventListener("dragenter", handleDragEnter);
    dropZone.addEventListener("dragover", handleDragOver);
    dropZone.addEventListener("dragleave", handleDragLeave);
    dropZone.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragover", preventBrowserDrop);
      window.removeEventListener("drop", preventBrowserDrop);
      dropZone.removeEventListener("dragenter", handleDragEnter);
      dropZone.removeEventListener("dragover", handleDragOver);
      dropZone.removeEventListener("dragleave", handleDragLeave);
      dropZone.removeEventListener("drop", handleDrop);
    };
  }, [handleDrop]);

  const openFilePicker = () => {
    if (!loading) fileInputRef.current?.click();
  };

  const loading =
    isLoading || step === STEPS.compressing || step === STEPS.scanning;
  const category = result ? getCategoryById(result.category) : null;

  return (
    <div className="space-y-4">
      <div
        ref={dropZoneRef}
        role="button"
        tabIndex={loading ? -1 : 0}
        aria-label="Upload receipt photo"
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFilePicker();
          }
        }}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300",
          isDragging
            ? "border-purple-500 bg-purple-50/80 scale-[1.01]"
            : "border-purple-200/80 bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50",
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2",
          isLoading && "pointer-events-none cursor-wait"
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.08),transparent_50%)]" />

        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-white shadow-lg shadow-purple-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">AI Receipt Scan</h3>
                <p className="text-sm text-muted-foreground">
                  Upload a slip — amount, date & category auto-fill
                </p>
              </div>
            </div>
            {result && !loading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetScanner}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Scan again
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-[140px_1fr]">
            <div
              className={cn(
                "relative aspect-[3/4] rounded-xl overflow-hidden border bg-white/70",
                !previewUrl && "flex items-center justify-center"
              )}
            >
              {previewUrl ? (
                <NextImage
                  src={previewUrl}
                  alt="Receipt preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="text-center p-4">
                  <Camera className="h-8 w-8 mx-auto text-purple-400 mb-2" />
                  <p className="text-xs text-muted-foreground">Preview</p>
                </div>
              )}

              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-2" />
                  <p className="text-sm font-medium text-purple-700">
                    {step === STEPS.compressing
                      ? "Optimizing image..."
                      : "Reading receipt..."}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Usually takes 5–15 seconds
                  </p>
                </div>
              )}

              {step === STEPS.done && (
                <div className="absolute top-2 right-2 rounded-full bg-green-500 p-1 text-white shadow">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between gap-4">
              {step === STEPS.done && result ? (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <p className="text-sm font-medium text-green-700 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Detected from receipt
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-white/80 border p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <IndianRupee className="h-3 w-3" />
                        Amount
                      </div>
                      <p className="font-semibold text-lg">
                        ₹{Number(result.amount).toFixed(2)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-white/80 border p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Calendar className="h-3 w-3" />
                        Date
                      </div>
                      <p className="font-medium text-sm">
                        {format(new Date(result.date), "MMM d, yyyy")}
                      </p>
                    </div>

                    {result.merchantName && (
                      <div className="rounded-lg bg-white/80 border p-3 col-span-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Store className="h-3 w-3" />
                          Merchant
                        </div>
                        <p className="font-medium text-sm truncate">
                          {result.merchantName}
                        </p>
                      </div>
                    )}

                    <div className="rounded-lg bg-white/80 border p-3 col-span-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                        <Tag className="h-3 w-3" />
                        Auto-selected category
                      </div>
                      <span
                        className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium text-white"
                        style={{ backgroundColor: category?.color || "#94a3b8" }}
                      >
                        {category?.name || "Other Expenses"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col justify-center gap-3 min-h-[120px]">
                  <p className="text-sm text-muted-foreground">
                    {isDragging
                      ? "Drop the image here to scan it"
                      : "Drag & drop a receipt photo anywhere on this card, or tap to upload. We’ll compress it first for faster scanning."}
                  </p>

                  {scanError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      {scanError.message}
                    </p>
                  )}
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
              />

              <Button
                type="button"
                disabled={loading}
                onClick={(event) => {
                  event.stopPropagation();
                  openFilePicker();
                }}
                className="w-full h-11 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:opacity-90 transition-opacity text-white border-0 shadow-md shadow-purple-500/25"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {step === STEPS.compressing
                      ? "Preparing..."
                      : "Analyzing receipt..."}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {result ? "Upload another receipt" : "Upload receipt photo"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
