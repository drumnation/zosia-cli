/**
 * Image Preview Module
 *
 * Provides inline image preview for terminals that support it (Kitty, iTerm2).
 * Falls back to a nice compact display for other terminals.
 */
/** Check if running in Kitty terminal */
export declare function isKittyTerminal(): boolean;
/** Check if running in iTerm2 */
export declare function isITerm2(): boolean;
/** Get image dimensions using sips (macOS) */
export declare function getImageDimensions(imagePath: string): {
    width: number;
    height: number;
} | null;
/** Get file size in human readable format */
export declare function getFileSize(imagePath: string): string;
/** Format image reference for display (short form) */
export declare function formatImageRef(imagePath: string): string;
/** Display image in Kitty terminal using icat */
export declare function displayImageKitty(imagePath: string, maxHeight?: number): boolean;
/** Generate a simple ASCII representation of image info */
export declare function generateImageCard(imagePath: string): string[];
/**
 * Create a compact token for the input field
 * Returns { display: string, actual: string }
 * - display: What to show in the input (short form)
 * - actual: The real path to include when sending
 */
export declare function createImageToken(imagePath: string): {
    display: string;
    actual: string;
};
/** Extract image tokens from text, returning { cleanText, images } */
export declare function parseImageTokens(text: string): {
    cleanText: string;
    images: Array<{
        display: string;
        path: string;
    }>;
};
/** Create an encoded token that stores path but displays nicely */
export declare function encodeImageToken(imagePath: string): string;
/** Decode image tokens back to @path format for sending */
export declare function decodeImageTokens(text: string): string;
/** Check if text contains image tokens */
export declare function hasImageTokens(text: string): boolean;
//# sourceMappingURL=image-preview.d.ts.map