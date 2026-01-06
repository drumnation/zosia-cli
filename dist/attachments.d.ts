/**
 * Attachment Parsing Module
 *
 * Detects and parses file paths and URLs from user input.
 * Enables file context injection into conversations.
 * Supports image files for vision models.
 */
/** Parsed attachment from user input */
export interface ParsedAttachment {
    type: 'file' | 'url';
    path: string;
    exists?: boolean;
    /** True if this is an image file supported by vision models */
    isImage?: boolean;
    /** MIME type for images */
    mimeType?: string;
}
/** Result of parsing attachments from text */
export interface AttachmentParseResult {
    attachments: ParsedAttachment[];
    cleanedText: string;
}
/**
 * Parse attachments (file paths and URLs) from input text
 */
export declare function parseAttachments(input: string): AttachmentParseResult;
/**
 * Read content from an attachment
 * Returns null if file doesn't exist or can't be read
 */
export declare function readAttachmentContent(attachment: ParsedAttachment): Promise<string | null>;
/** Result of reading an image for the API */
export interface ImageContent {
    /** Base64-encoded image data */
    base64: string;
    /** MIME type (e.g., 'image/png') */
    mimeType: string;
    /** Original file path */
    path: string;
    /** File size in bytes */
    sizeBytes: number;
}
/**
 * Check if an attachment is a supported image
 */
export declare function isImageAttachment(attachment: ParsedAttachment): boolean;
/**
 * Read an image file and return base64-encoded content for vision API
 * Returns null if file doesn't exist, isn't an image, or is too large
 */
export declare function readImageAsBase64(attachment: ParsedAttachment): Promise<ImageContent | null>;
/**
 * Get all images from a list of attachments
 */
export declare function getImageAttachments(attachments: ParsedAttachment[]): Promise<ImageContent[]>;
/**
 * Check if any attachments contain images
 */
export declare function hasImages(attachments: ParsedAttachment[]): boolean;
//# sourceMappingURL=attachments.d.ts.map