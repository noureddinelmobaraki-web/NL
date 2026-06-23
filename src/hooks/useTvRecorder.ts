/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback } from "react";

export function useTvRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  const startRecording = useCallback(async (video: HTMLVideoElement) => {
    setIsRecording(false);
    setErrorMsg(null);
    chunksRef.current = [];

    let stream: MediaStream | null = null;
    let usingDisplayMedia = false;

    // Try direct HTMLVideoElement Stream Capture first (Requires CORS)
    try {
      const vid = video as any;
      const captureStreamFn = vid.captureStream || vid.mozCaptureStream;
      if (captureStreamFn) {
        stream = captureStreamFn.call(video);
        if (!stream || stream.getTracks().length === 0) {
          throw new Error("Empty tracks captured");
        }
      } else {
        throw new Error("No browser capture stream support");
      }
    } catch {
      // Fallback: Screen Capture
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: "browser" },
            audio: true
          });
          usingDisplayMedia = true;
        } else {
          throw new Error("Media Capture API completely unsupported in this environment");
        }
      } catch (err) {
        console.error("Screen recording request declined or failed:", err);
        setErrorMsg("Failed to start recording. Permission denied.");
        return;
      }
    }

    if (!stream) {
      setErrorMsg("Failed to initialize capture stream.");
      return;
    }

    streamRef.current = stream;

    try {
      // Search for the best media container format
      const options = { mimeType: "video/webm;codecs=vp9,opus" };
      let recorder: MediaRecorder;
      if (MediaRecorder.isTypeSupported(options.mimeType)) {
        recorder = new MediaRecorder(stream, options);
      } else if (MediaRecorder.isTypeSupported("video/webm")) {
        recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      } else {
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const name = `NL-TV-Record-${Date.now()}.webm`;

        try {
          // File System Access API
          const win = window as any;
          if (win.showSaveFilePicker) {
            const handle = await win.showSaveFilePicker({
              suggestedName: name,
              types: [
                {
                  description: "WebM Video File",
                  accept: { "video/webm": [".webm"] }
                }
              ]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
          } else {
            // Traditional download injection
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 4000);
          }
        } catch (saveErr) {
          console.warn("User canceled or save aborted:", saveErr);
        }

        // Clean up stream tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (recorderErr) {
      console.error("Error launching MediaRecorder:", recorderErr);
      setErrorMsg(
        usingDisplayMedia
          ? "Screen recorder not compatible. Try another browser."
          : "Direct stream capture blocked by security policies (CORS). We will try screen recording."
      );
      
      // Attempt screen recording if captureStream threw SecurityError
      if (!usingDisplayMedia) {
        try {
          const fallbackStream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: "browser" },
            audio: true
          });
          streamRef.current = fallbackStream;
          const recorder = new MediaRecorder(fallbackStream, { mimeType: "video/webm" });
          mediaRecorderRef.current = recorder;
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
          };
          recorder.onstop = async () => {
            setIsRecording(false);
            const blob = new Blob(chunksRef.current, { type: "video/webm" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `NL-TV-ScreenRecord-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 4000);
            if (streamRef.current) {
              streamRef.current.getTracks().forEach((track) => track.stop());
              streamRef.current = null;
            }
          };
          recorder.start();
          setIsRecording(true);
          setErrorMsg(null);
        } catch {
          setErrorMsg("Recording blocked by CORS security on this video stream source.");
        }
      }
    }
  }, []);

  return {
    isRecording,
    errorMsg,
    startRecording,
    stopRecording
  };
}
