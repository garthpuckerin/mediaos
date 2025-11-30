import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SetupSchema = z.object({
  folders: z.array(
    z.object({
      path: z.string(),
      type: z.enum(['movies', 'series']),
    })
  ),
});

const BrowseSchema = z.object({
  path: z.string().optional(),
});

const OpenExplorerSchema = z.object({
  path: z.string(),
});

const PickFolderSchema = z.object({
  startPath: z.string().optional(),
});

export async function onboardingRoutes(fastify: FastifyInstance) {
  fastify.post('/setup', async (request, reply) => {
    const { folders } = SetupSchema.parse(request.body);

    // In a real app, we would save these to the database
    fastify.log.info({ msg: 'Saving folders', folders });

    return { success: true, message: 'Folders saved' };
  });

  fastify.post('/scan', async (request, reply) => {
    // Trigger library scan
    // const libraryService = fastify.services.library; // Assuming service injection
    fastify.log.info('Starting library scan...');

    // Simulate scan start
    return { success: true, message: 'Scan started' };
  });

  fastify.get('/status', async (request, reply) => {
    // Return mock status
    return {
      scanning: false,
      progress: 100,
      currentFile: null,
    };
  });

  fastify.post('/browse', async (request, reply) => {
    const { path: requestedPath } = BrowseSchema.parse(request.body);

    // Start from home directory if no path provided
    const basePath = requestedPath || os.homedir();

    try {
      const stats = await fs.promises.stat(basePath);

      if (!stats.isDirectory()) {
        return {
          ok: false,
          error: 'Path is not a directory',
        };
      }

      const entries = await fs.promises.readdir(basePath, {
        withFileTypes: true,
      });

      const directories = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
          name: entry.name,
          path: path.join(basePath, entry.name),
          type: 'directory' as const,
        }))
        .sort((a, b) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );

      // Get parent directory path
      const parentPath =
        basePath !== path.parse(basePath).root ? path.dirname(basePath) : null;

      return {
        ok: true,
        currentPath: basePath,
        parentPath,
        directories,
      };
    } catch (error) {
      fastify.log.error(
        { error, path: basePath },
        'Failed to browse directory'
      );
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : 'Failed to read directory',
      };
    }
  });

  fastify.post('/open-explorer', async (request, reply) => {
    const { path: targetPath } = OpenExplorerSchema.parse(request.body);

    try {
      // Verify the path exists
      const stats = await fs.promises.stat(targetPath);
      if (!stats.isDirectory()) {
        return {
          ok: false,
          error: 'Path is not a directory',
        };
      }

      // Open file explorer based on platform
      const platform = os.platform();
      let command: string;

      if (platform === 'win32') {
        // Windows - use explorer.exe
        command = `explorer "${targetPath}"`;
      } else if (platform === 'darwin') {
        // macOS - use open
        command = `open "${targetPath}"`;
      } else {
        // Linux - try xdg-open
        command = `xdg-open "${targetPath}"`;
      }

      await execAsync(command);

      return {
        ok: true,
        message: 'File explorer opened',
      };
    } catch (error) {
      fastify.log.error(
        { error, path: targetPath },
        'Failed to open file explorer'
      );
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to open file explorer',
      };
    }
  });

  fastify.post('/pick-folder', async (request, reply) => {
    const { startPath } = PickFolderSchema.parse(request.body);
    const platform = os.platform();

    try {
      let selectedPath: string | null = null;

      if (platform === 'win32') {
        // Windows - use PowerShell folder dialog
        const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$folderBrowser = New-Object System.Windows.Forms.FolderBrowserDialog
${startPath ? `$folderBrowser.SelectedPath = "${startPath}"` : ''}
$folderBrowser.Description = "Select a folder"
$folderBrowser.ShowNewFolderButton = $true
$result = $folderBrowser.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $folderBrowser.SelectedPath
}
`.trim();

        const { stdout, stderr } = await execAsync(
          `powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"')}"`,
          { timeout: 60000 } // 60 second timeout
        );

        selectedPath = stdout.trim();
      } else if (platform === 'darwin') {
        // macOS - use osascript
        const startDir = startPath || os.homedir();
        const { stdout } = await execAsync(
          `osascript -e 'POSIX path of (choose folder with prompt "Select a folder" default location POSIX file "${startDir}")'`
        );
        selectedPath = stdout.trim();
      } else {
        // Linux - use zenity if available
        const startDir = startPath || os.homedir();
        const { stdout } = await execAsync(
          `zenity --file-selection --directory --filename="${startDir}/"`
        );
        selectedPath = stdout.trim();
      }

      if (selectedPath && selectedPath.length > 0) {
        return {
          ok: true,
          path: selectedPath,
        };
      } else {
        return {
          ok: false,
          error: 'No folder selected',
        };
      }
    } catch (error) {
      fastify.log.error({ error }, 'Failed to pick folder');
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to open folder picker',
      };
    }
  });
}
