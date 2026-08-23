import { FileText, FileImage, FileVideo, FileAudio, FileArchive, FileCode, File as FileGeneric } from "lucide-react";

export function FileTypeIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  const cls = className ?? "h-5 w-5";

  if (mimeType.startsWith("image/")) return <FileImage className={cls} />;
  if (mimeType.startsWith("video/")) return <FileVideo className={cls} />;
  if (mimeType.startsWith("audio/")) return <FileAudio className={cls} />;
  if (mimeType === "application/pdf" || mimeType.startsWith("text/")) return <FileText className={cls} />;
  if (mimeType.includes("zip") || mimeType.includes("compressed") || mimeType.includes("tar"))
    return <FileArchive className={cls} />;
  if (mimeType.includes("json") || mimeType.includes("javascript") || mimeType.includes("xml"))
    return <FileCode className={cls} />;
  return <FileGeneric className={cls} />;
}
