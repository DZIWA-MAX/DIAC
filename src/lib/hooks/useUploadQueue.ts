"use client";

import { useCallback, useRef, useState } from "react";

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number; // 0-100
  status: "uploading" | "done" | "error" | "canceled";
  error?: string;
  speedBps: number;
}

export function useUploadQueue(onComplete?: () => void) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const controllers = useRef<Map<string, XMLHttpRequest>>(new Map());

  const upload = useCallback(
    (file: File, folderId: string | null) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      setItems((prev) => [
        ...prev,
        { id, name: file.name, size: file.size, progress: 0, status: "uploading", speedBps: 0 },
      ]);

      const xhr = new XMLHttpRequest();
      controllers.current.set(id, xhr);

      const formData = new FormData();
      formData.append("file", file);
      if (folderId) formData.append("folderId", folderId);

      let lastLoaded = 0;
      let lastTime = Date.now();

      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const now = Date.now();
        const elapsed = (now - lastTime) / 1000;
        const speedBps = elapsed > 0 ? (e.loaded - lastLoaded) / elapsed : 0;
        lastLoaded = e.loaded;
        lastTime = now;

        setItems((prev) =>
          prev.map((it) =>
            it.id === id ? { ...it, progress: Math.round((e.loaded / e.total) * 100), speedBps } : it
          )
        );
      };

      xhr.onload = () => {
        controllers.current.delete(id);
        if (xhr.status >= 200 && xhr.status < 300) {
          setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "done", progress: 100 } : it)));
          onComplete?.();
        } else {
          let message = "Falha no upload.";
          try {
            message = JSON.parse(xhr.responseText)?.error || message;
          } catch {
            // ignore parse failure, use default message
          }
          setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "error", error: message } : it)));
        }
      };

      xhr.onerror = () => {
        controllers.current.delete(id);
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, status: "error", error: "Erro de rede." } : it))
        );
      };

      xhr.open("POST", "/api/files/upload");
      xhr.send(formData);
    },
    [onComplete]
  );

  const cancel = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "canceled" } : it)));
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  return { items, upload, cancel, dismiss };
}
