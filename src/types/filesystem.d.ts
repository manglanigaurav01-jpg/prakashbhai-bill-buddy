declare module '@capacitor/filesystem' {
  export interface FileInfo {
    name: string;
    type: string;
    size: number;
    mtime: number;
    uri: string;
  }

  export interface ReaddirResult {
    files: FileInfo[];
  }

  export type Directory = 'CACHE' | 'DATA' | 'DOCUMENTS' | 'EXTERNAL' | 'EXTERNAL_STORAGE';

  export interface FilesystemPlugin {
    readdir(options: { path: string; directory: Directory }): Promise<ReaddirResult>;
    deleteFile(options: { path: string; directory: Directory }): Promise<void>;
    writeFile(options: { path: string; data: string; directory: Directory }): Promise<{ uri: string }>;
    readFile(options: { path: string; directory: Directory }): Promise<{ data: string }>;
    getUri(options: { path: string; directory: Directory }): Promise<{ uri: string }>;
  }

  export const Filesystem: FilesystemPlugin;
  export { Directory };
}