/**
 * Attachment Parsing Tests - TDD
 *
 * Tests for detecting and parsing file paths and URLs from user input.
 * These tests are written FIRST before implementation (RED phase).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Import the module we're going to build
import {
  parseAttachments,
  type ParsedAttachment,
} from '../src/attachments.js';

describe('Attachment Parsing', () => {
  let testDir: string;

  beforeEach(() => {
    // Create temp directory for test files
    testDir = join(tmpdir(), `zosia-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('parseAttachments()', () => {
    describe('file path detection', () => {
      it('should detect absolute Unix paths', () => {
        const input = 'Check this file /Users/test/document.txt please';
        const result = parseAttachments(input);

        expect(result.attachments).toHaveLength(1);
        expect(result.attachments[0]).toMatchObject({
          type: 'file',
          path: '/Users/test/document.txt',
        });
      });

      it('should detect paths with spaces when quoted', () => {
        const input = 'Look at "/Users/test/my document.txt" for me';
        const result = parseAttachments(input);

        expect(result.attachments).toHaveLength(1);
        expect(result.attachments[0].path).toBe('/Users/test/my document.txt');
      });

      it('should detect relative paths starting with ./', () => {
        const input = 'Check ./src/index.ts';
        const result = parseAttachments(input);

        expect(result.attachments).toHaveLength(1);
        expect(result.attachments[0].path).toBe('./src/index.ts');
      });

      it('should detect relative paths starting with ../', () => {
        const input = 'Look at ../package.json';
        const result = parseAttachments(input);

        expect(result.attachments).toHaveLength(1);
        expect(result.attachments[0].path).toBe('../package.json');
      });

      it('should detect home directory paths (~)', () => {
        const input = 'Check ~/Documents/notes.md';
        const result = parseAttachments(input);

        expect(result.attachments).toHaveLength(1);
        expect(result.attachments[0].path).toBe('~/Documents/notes.md');
      });

      it('should detect multiple file paths', () => {
        const input = 'Compare /path/to/file1.ts and /path/to/file2.ts';
        const result = parseAttachments(input);

        expect(result.attachments).toHaveLength(2);
        expect(result.attachments[0].path).toBe('/path/to/file1.ts');
        expect(result.attachments[1].path).toBe('/path/to/file2.ts');
      });

      it('should not detect words that look like paths but are not', () => {
        const input = 'The price is $50/month for this service';
        const result = parseAttachments(input);

        expect(result.attachments).toHaveLength(0);
      });
    });

    describe('URL detection', () => {
      it('should detect https URLs', () => {
        const input = 'Check https://example.com/page for info';
        const result = parseAttachments(input);

        expect(result.attachments).toHaveLength(1);
        expect(result.attachments[0]).toMatchObject({
          type: 'url',
          path: 'https://example.com/page',
        });
      });

      it('should detect http URLs', () => {
        const input = 'See http://localhost:3000/api';
        const result = parseAttachments(input);

        expect(result.attachments).toHaveLength(1);
        expect(result.attachments[0].type).toBe('url');
      });

      it('should detect URLs with query parameters', () => {
        const input = 'Visit https://example.com/search?q=test&page=1';
        const result = parseAttachments(input);

        expect(result.attachments).toHaveLength(1);
        expect(result.attachments[0].path).toBe('https://example.com/search?q=test&page=1');
      });

      it('should detect file:// URLs', () => {
        const input = 'Open file:///Users/test/doc.pdf';
        const result = parseAttachments(input);

        expect(result.attachments).toHaveLength(1);
        expect(result.attachments[0].type).toBe('url');
      });
    });

    describe('file existence checking', () => {
      it('should mark existing files with exists: true', () => {
        const testFile = join(testDir, 'exists.txt');
        writeFileSync(testFile, 'test content');

        const input = `Check ${testFile} please`;
        const result = parseAttachments(input);

        expect(result.attachments).toHaveLength(1);
        expect(result.attachments[0].exists).toBe(true);
      });

      it('should mark non-existing files with exists: false', () => {
        const fakePath = join(testDir, 'does-not-exist.txt');

        const input = `Check ${fakePath} please`;
        const result = parseAttachments(input);

        expect(result.attachments).toHaveLength(1);
        expect(result.attachments[0].exists).toBe(false);
      });

      it('should not check existence for URLs', () => {
        const input = 'Check https://example.com/file.txt';
        const result = parseAttachments(input);

        expect(result.attachments).toHaveLength(1);
        expect(result.attachments[0].exists).toBeUndefined();
      });
    });

    describe('cleaned text', () => {
      it('should return text with file paths removed', () => {
        const input = 'Check /path/to/file.txt for errors';
        const result = parseAttachments(input);

        expect(result.cleanedText).toBe('Check  for errors');
      });

      it('should preserve text when no attachments', () => {
        const input = 'Just a normal message';
        const result = parseAttachments(input);

        expect(result.cleanedText).toBe('Just a normal message');
      });

      it('should handle multiple attachments', () => {
        const input = 'Compare /file1.txt with /file2.txt please';
        const result = parseAttachments(input);

        expect(result.cleanedText).toBe('Compare  with  please');
      });
    });

    describe('edge cases', () => {
      it('should handle empty input', () => {
        const result = parseAttachments('');

        expect(result.attachments).toHaveLength(0);
        expect(result.cleanedText).toBe('');
      });

      it('should handle input with only whitespace', () => {
        const result = parseAttachments('   \n\t  ');

        expect(result.attachments).toHaveLength(0);
      });

      it('should handle mixed files and URLs', () => {
        const input = 'Check /local/file.txt and https://remote.com/doc.pdf';
        const result = parseAttachments(input);

        expect(result.attachments).toHaveLength(2);
        expect(result.attachments.filter(a => a.type === 'file')).toHaveLength(1);
        expect(result.attachments.filter(a => a.type === 'url')).toHaveLength(1);
      });

      it('should handle Windows-style paths', () => {
        const input = 'Check C:\\Users\\test\\file.txt';
        const result = parseAttachments(input);

        // Should detect Windows paths
        expect(result.attachments).toHaveLength(1);
        expect(result.attachments[0].type).toBe('file');
      });
    });
  });
});

describe('File Content Reading', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `zosia-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('readAttachmentContent()', () => {
    it('should read text file content', async () => {
      const { readAttachmentContent } = await import('../src/attachments.js');

      const testFile = join(testDir, 'test.txt');
      writeFileSync(testFile, 'Hello, World!');

      const content = await readAttachmentContent({
        type: 'file',
        path: testFile,
        exists: true,
      });

      expect(content).toBe('Hello, World!');
    });

    it('should return null for non-existing files', async () => {
      const { readAttachmentContent } = await import('../src/attachments.js');

      const content = await readAttachmentContent({
        type: 'file',
        path: '/non/existent/file.txt',
        exists: false,
      });

      expect(content).toBeNull();
    });

    it('should truncate large files', async () => {
      const { readAttachmentContent } = await import('../src/attachments.js');

      const testFile = join(testDir, 'large.txt');
      const largeContent = 'x'.repeat(100000); // 100KB
      writeFileSync(testFile, largeContent);

      const content = await readAttachmentContent({
        type: 'file',
        path: testFile,
        exists: true,
      });

      // Should be truncated with indicator
      expect(content).not.toBe(largeContent);
      expect(content).toContain('[truncated]');
    });

    it('should handle binary files gracefully', async () => {
      const { readAttachmentContent } = await import('../src/attachments.js');

      const testFile = join(testDir, 'binary.bin');
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]);
      writeFileSync(testFile, binaryContent);

      const content = await readAttachmentContent({
        type: 'file',
        path: testFile,
        exists: true,
      });

      // Should indicate it's binary
      expect(content).toContain('binary');
    });
  });
});

describe('Image Support', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `zosia-test-images-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('image detection', () => {
    it('should detect PNG files as images', () => {
      const result = parseAttachments('Look at /path/to/screenshot.png');

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].isImage).toBe(true);
      expect(result.attachments[0].mimeType).toBe('image/png');
    });

    it('should detect JPG files as images', () => {
      const result = parseAttachments('Check /photos/vacation.jpg');

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].isImage).toBe(true);
      expect(result.attachments[0].mimeType).toBe('image/jpeg');
    });

    it('should detect JPEG files as images', () => {
      const result = parseAttachments('See /images/photo.jpeg');

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].isImage).toBe(true);
      expect(result.attachments[0].mimeType).toBe('image/jpeg');
    });

    it('should detect GIF files as images', () => {
      const result = parseAttachments('Look at /gifs/animation.gif');

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].isImage).toBe(true);
      expect(result.attachments[0].mimeType).toBe('image/gif');
    });

    it('should detect WEBP files as images', () => {
      const result = parseAttachments('See /images/modern.webp');

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].isImage).toBe(true);
      expect(result.attachments[0].mimeType).toBe('image/webp');
    });

    it('should NOT detect non-image files as images', () => {
      const result = parseAttachments('Check /docs/readme.txt');

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].isImage).toBeFalsy();
    });
  });

  describe('isImageAttachment()', () => {
    it('should return true for existing image files', async () => {
      const { isImageAttachment } = await import('../src/attachments.js');

      expect(isImageAttachment({
        type: 'file',
        path: '/test/image.png',
        exists: true,
        isImage: true,
        mimeType: 'image/png',
      })).toBe(true);
    });

    it('should return false for non-existing image files', async () => {
      const { isImageAttachment } = await import('../src/attachments.js');

      expect(isImageAttachment({
        type: 'file',
        path: '/test/image.png',
        exists: false,
        isImage: true,
        mimeType: 'image/png',
      })).toBe(false);
    });

    it('should return false for non-image files', async () => {
      const { isImageAttachment } = await import('../src/attachments.js');

      expect(isImageAttachment({
        type: 'file',
        path: '/test/doc.txt',
        exists: true,
        isImage: false,
      })).toBe(false);
    });
  });

  describe('hasImages()', () => {
    it('should return true when attachments include images', async () => {
      const { hasImages } = await import('../src/attachments.js');

      const attachments = [
        { type: 'file' as const, path: '/test.txt', exists: true },
        { type: 'file' as const, path: '/image.png', exists: true, isImage: true, mimeType: 'image/png' },
      ];

      expect(hasImages(attachments)).toBe(true);
    });

    it('should return false when no images in attachments', async () => {
      const { hasImages } = await import('../src/attachments.js');

      const attachments = [
        { type: 'file' as const, path: '/test.txt', exists: true },
        { type: 'url' as const, path: 'https://example.com' },
      ];

      expect(hasImages(attachments)).toBe(false);
    });
  });

  describe('readImageAsBase64()', () => {
    it('should read image file and return base64', async () => {
      const { readImageAsBase64 } = await import('../src/attachments.js');

      // Create a minimal valid PNG (1x1 transparent pixel)
      const testImage = join(testDir, 'test.png');
      const pngData = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, // IDAT chunk
        0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, // IEND chunk
        0x42, 0x60, 0x82,
      ]);
      writeFileSync(testImage, pngData);

      const result = await readImageAsBase64({
        type: 'file',
        path: testImage,
        exists: true,
        isImage: true,
        mimeType: 'image/png',
      });

      expect(result).not.toBeNull();
      expect(result!.base64).toBeTruthy();
      expect(result!.mimeType).toBe('image/png');
      expect(result!.path).toBe(testImage);
      expect(result!.sizeBytes).toBeGreaterThan(0);
    });

    it('should return null for non-image attachments', async () => {
      const { readImageAsBase64 } = await import('../src/attachments.js');

      const result = await readImageAsBase64({
        type: 'file',
        path: '/test.txt',
        exists: true,
        isImage: false,
      });

      expect(result).toBeNull();
    });

    it('should return null for non-existing images', async () => {
      const { readImageAsBase64 } = await import('../src/attachments.js');

      const result = await readImageAsBase64({
        type: 'file',
        path: '/non/existent/image.png',
        exists: false,
        isImage: true,
        mimeType: 'image/png',
      });

      expect(result).toBeNull();
    });
  });

  describe('getImageAttachments()', () => {
    it('should extract only image attachments from list', async () => {
      const { getImageAttachments } = await import('../src/attachments.js');

      // Create test image
      const testImage = join(testDir, 'test.png');
      const pngData = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
        0x42, 0x60, 0x82,
      ]);
      writeFileSync(testImage, pngData);

      const attachments = [
        { type: 'file' as const, path: '/test.txt', exists: true },
        { type: 'file' as const, path: testImage, exists: true, isImage: true, mimeType: 'image/png' },
        { type: 'url' as const, path: 'https://example.com' },
      ];

      const images = await getImageAttachments(attachments);

      expect(images).toHaveLength(1);
      expect(images[0].mimeType).toBe('image/png');
    });
  });
});
