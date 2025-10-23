export type FileRecord = {
  key: string;
  fileName: string;
  size: number;
  lastModified: string;
  uploadedBy?: string;
  permissions?: string[];
  cdnUrl: string;
  url: string;
  status?: "ativo" | "arquivado";
  contentType?: string;
};

export type FilesResponse = {
  files: FileRecord[];
  stats: {
    totalFiles: number;
    totalSize: number;
    lastUpdated: string;
    bucket: string;
    cdnHost: string;
  };
  recentUploads: Array<{
    id: string;
    fileName: string;
    uploadedAt: string;
    uploadedBy?: string;
    size: number;
  }>;
};
