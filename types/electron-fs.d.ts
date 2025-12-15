// Type definitions for Electron API exposed via preload script

interface ElectronFS {
    readDirectory: (dirPath: string, maxDepth?: number) => Promise<FileSystemNode[]>;
    readFile: (filePath: string) => Promise<string>;
    writeFile: (filePath: string, content: string) => Promise<boolean>;
    pathExists: (filePath: string) => Promise<boolean>;
    getStats: (filePath: string) => Promise<{
        isFile: boolean;
        isDirectory: boolean;
        size: number;
        modified: Date;
        created: Date;
    }>;
    watch: (dirPath: string) => Promise<boolean>;
    unwatch: (dirPath: string) => Promise<boolean>;
    onFileChange: (callback: (event: {
        eventType: string;
        path: string;
        projectPath: string;
    }) => void) => () => void;
}

interface FileSystemNode {
    id: string;
    name: string;
    type: "file" | "folder";
    path: string;
    extension?: string;
    children?: FileSystemNode[];
    isExpanded?: boolean;
}

interface Window {
    electronFS?: ElectronFS;
}
