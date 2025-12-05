/**
 * Scanner Module Exports
 */

export {
  parseFilename,
  isMediaFile,
  isVideoFile,
  isAudioFile,
  isBookFile,
  type ParsedMedia,
} from './fileParser.js';

export {
  LibraryScanner,
  getScanner,
  type ScanProgress,
  type ScannedItem,
  type ScanResult,
  type MediaFolder,
} from './scanner.js';

export {
  DEFAULT_NAMING_CONFIG,
  cleanForFilename,
  applyTemplate,
  generateFolderPath,
  generateFilename,
  previewOrganizedPath,
  type NamingConfig,
} from './namingTemplates.js';

export {
  FileOrganizer,
  getOrganizer,
  type FileOperation,
  type ConflictResolution,
  type OrganizeOptions,
  type OrganizeResult,
  type OrganizeProgress,
  type OrganizeSummary,
} from './fileOrganizer.js';
