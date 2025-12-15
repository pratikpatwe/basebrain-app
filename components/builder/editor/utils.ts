import { EXTENSION_TO_LANGUAGE, FILE_ICONS, type FileSystemNode, type FileNode, type FolderNode } from "./types"

/**
 * Get the file extension from a filename
 */
export function getFileExtension(filename: string): string {
    const parts = filename.split(".")
    if (parts.length > 1) {
        return parts[parts.length - 1].toLowerCase()
    }
    return ""
}

/**
 * Get the language identifier for Monaco based on file extension
 */
export function getLanguageFromExtension(extension: string): string {
    return EXTENSION_TO_LANGUAGE[extension.toLowerCase()] || "plaintext"
}

/**
 * Get the language identifier for Monaco based on filename
 */
export function getLanguageFromFilename(filename: string): string {
    const extension = getFileExtension(filename)
    return getLanguageFromExtension(extension)
}

/**
 * Get file icon based on extension
 */
export function getFileIcon(extension: string, isFolder = false, isExpanded = false): string {
    if (isFolder) {
        return isExpanded ? FILE_ICONS.folderOpen : FILE_ICONS.folder
    }
    return FILE_ICONS[extension.toLowerCase()] || FILE_ICONS.default
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Get the path segments from a file path
 */
export function getPathSegments(path: string): string[] {
    return path.split(/[/\\]/).filter(Boolean)
}

/**
 * Sort file system nodes (folders first, then alphabetically)
 */
export function sortFileSystemNodes(nodes: FileSystemNode[]): FileSystemNode[] {
    return [...nodes].sort((a, b) => {
        // Folders come first
        if (a.type === "folder" && b.type === "file") return -1
        if (a.type === "file" && b.type === "folder") return 1
        // Alphabetically within same type
        return a.name.localeCompare(b.name)
    })
}

/**
 * Find a node by path in the file tree
 */
export function findNodeByPath(nodes: FileSystemNode[], path: string): FileSystemNode | null {
    for (const node of nodes) {
        if (node.path === path) {
            return node
        }
        if (node.type === "folder" && node.children) {
            const found = findNodeByPath(node.children, path)
            if (found) return found
        }
    }
    return null
}

/**
 * Check if a node is a file
 */
export function isFileNode(node: FileSystemNode): node is FileNode {
    return node.type === "file"
}

/**
 * Check if a node is a folder
 */
export function isFolderNode(node: FileSystemNode): node is FolderNode {
    return node.type === "folder"
}

/**
 * Create a demo file tree for testing
 */
export function createDemoFileTree(): FileSystemNode[] {
    return [
        {
            id: generateId(),
            name: "src",
            type: "folder",
            path: "/src",
            isExpanded: true,
            children: [
                {
                    id: generateId(),
                    name: "components",
                    type: "folder",
                    path: "/src/components",
                    isExpanded: true,
                    children: [
                        {
                            id: generateId(),
                            name: "Button.tsx",
                            type: "file",
                            path: "/src/components/Button.tsx",
                            extension: "tsx",
                            language: "typescript",
                            content: `import React from 'react'

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline'
  onClick?: () => void
}

export function Button({ children, variant = 'primary', onClick }: ButtonProps) {
  return (
    <button
      className={\`btn btn-\${variant}\`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}`,
                        },
                        {
                            id: generateId(),
                            name: "Card.tsx",
                            type: "file",
                            path: "/src/components/Card.tsx",
                            extension: "tsx",
                            language: "typescript",
                            content: `import React from 'react'

interface CardProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export function Card({ title, description, children }: CardProps) {
  return (
    <div className="card">
      <h3 className="card-title">{title}</h3>
      {description && <p className="card-description">{description}</p>}
      {children && <div className="card-content">{children}</div>}
    </div>
  )
}`,
                        },
                    ],
                },
                {
                    id: generateId(),
                    name: "utils",
                    type: "folder",
                    path: "/src/utils",
                    isExpanded: false,
                    children: [
                        {
                            id: generateId(),
                            name: "helpers.ts",
                            type: "file",
                            path: "/src/utils/helpers.ts",
                            extension: "ts",
                            language: "typescript",
                            content: `// Helper utilities

export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}`,
                        },
                    ],
                },
                {
                    id: generateId(),
                    name: "App.tsx",
                    type: "file",
                    path: "/src/App.tsx",
                    extension: "tsx",
                    language: "typescript",
                    content: `import React from 'react'
import { Button } from './components/Button'
import { Card } from './components/Card'
import './styles.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Welcome to My App</h1>
      </header>
      <main className="app-main">
        <Card 
          title="Getting Started"
          description="This is a sample application."
        >
          <Button variant="primary" onClick={() => alert('Hello!')}>
            Click Me
          </Button>
        </Card>
      </main>
    </div>
  )
}

export default App`,
                },
                {
                    id: generateId(),
                    name: "styles.css",
                    type: "file",
                    path: "/src/styles.css",
                    extension: "css",
                    language: "css",
                    content: `/* App styles */
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  color: white;
}

.app-main {
  flex: 1;
  padding: 2rem;
  background: #f5f5f5;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
  border: none;
}

.btn-primary:hover {
  background: #5a67d8;
}

.card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}`,
                },
            ],
        },
        {
            id: generateId(),
            name: "public",
            type: "folder",
            path: "/public",
            isExpanded: false,
            children: [
                {
                    id: generateId(),
                    name: "index.html",
                    type: "file",
                    path: "/public/index.html",
                    extension: "html",
                    language: "html",
                    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`,
                },
                {
                    id: generateId(),
                    name: "favicon.ico",
                    type: "file",
                    path: "/public/favicon.ico",
                    extension: "ico",
                },
            ],
        },
        {
            id: generateId(),
            name: "package.json",
            type: "file",
            path: "/package.json",
            extension: "json",
            language: "json",
            content: `{
  "name": "my-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}`,
        },
        {
            id: generateId(),
            name: "tsconfig.json",
            type: "file",
            path: "/tsconfig.json",
            extension: "json",
            language: "json",
            content: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}`,
        },
        {
            id: generateId(),
            name: "README.md",
            type: "file",
            path: "/README.md",
            extension: "md",
            language: "markdown",
            content: `# My App

A modern React application built with Vite.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Features

- ⚡ Fast development with Vite
- 🎨 Modern component library
- 📱 Responsive design
- 🔒 TypeScript support

## License

MIT`,
        },
    ]
}
