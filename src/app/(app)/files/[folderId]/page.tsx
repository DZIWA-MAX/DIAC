import { FileManager } from "@/components/dashboard/FileManager";

export default function FilesFolderPage({ params }: { params: { folderId: string } }) {
  return <FileManager folderId={params.folderId} />;
}
