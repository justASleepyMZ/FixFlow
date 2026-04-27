import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, ScanFace, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FaceScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: (imageUrl: string) => void;
}

export const FaceScanDialog = ({ open, onOpenChange, onVerified }: FaceScanDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [starting, setStarting] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  };

  const startCamera = async () => {
    setStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not available in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setStreaming(true);
      // Attach stream after state update so the <video> is mounted/visible
      requestAnimationFrame(async () => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        try {
          await video.play();
        } catch {
          /* autoplay may need user gesture; ignore */
        }
      });
    } catch (err: any) {
      const name = err?.name;
      let description = err?.message || "Please allow camera access to verify your face.";
      if (name === "NotAllowedError") description = "Permission denied. Allow camera access in your browser settings.";
      else if (name === "NotFoundError") description = "No camera found on this device.";
      else if (name === "NotReadableError") description = "Camera is in use by another application.";
      toast({ title: "Camera access denied", description, variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (!open) stopCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleScan = async () => {
    if (!videoRef.current || !canvasRef.current || !user) return;
    setScanning(true);
    setProgress(0);

    // Simulated scan progress for UX
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 90));
    }, 150);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Capture failed"))), "image/jpeg", 0.9)
      );

      const path = `${user.id}/face-${Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("face-scans")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: signed, error: signedErr } = await supabase.storage
        .from("face-scans")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signedErr) throw signedErr;

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ face_verified: true, face_image_url: signed.signedUrl })
        .eq("user_id", user.id);
      if (updateErr) throw updateErr;

      clearInterval(interval);
      setProgress(100);

      setTimeout(() => {
        onVerified(signed.signedUrl);
        toast({ title: "Face verified", description: "Your identity has been confirmed." });
        stopCamera();
        onOpenChange(false);
        setScanning(false);
        setProgress(0);
      }, 600);
    } catch (err: any) {
      clearInterval(interval);
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
      setScanning(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanFace className="h-5 w-5" />
            Face Verification
          </DialogTitle>
          <DialogDescription>
            Position your face inside the frame and hold still while we scan.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${streaming ? "block" : "hidden"}`}
          />
          {!streaming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Camera className="h-12 w-12 mb-2" />
              <p className="text-sm">Camera is off</p>
            </div>
          )}

          {/* Face guide overlay */}
          {streaming && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className={`h-3/4 w-3/4 rounded-full border-4 transition-colors ${
                  scanning ? "border-primary animate-pulse" : "border-white/70"
                }`}
              />
            </div>
          )}

          {scanning && (
            <div className="absolute bottom-0 left-0 right-0 bg-background/90 p-3">
              <div className="flex items-center gap-2 mb-1.5 text-sm font-medium">
                {progress === 100 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-secondary" /> Verified
                  </>
                ) : (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Scanning… {progress}%
                  </>
                )}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex gap-2">
          {!streaming ? (
            <Button onClick={startCamera} disabled={starting} className="w-full gap-2">
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Start Camera
            </Button>
          ) : (
            <Button onClick={handleScan} disabled={scanning} className="w-full gap-2">
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanFace className="h-4 w-4" />}
              Scan Face
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
