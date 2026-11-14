export const DISPLAY_FONT = 'Kavoon, Georgia, serif';
export const READING_FONT = '"Crimson Pro", Georgia, serif';

export const PARCHMENT_LABEL = {
    fontFamily: DISPLAY_FONT,
    color: '#392419',
    backgroundColor: '#f0d9a5',
};

// Phaser paints text into textures, so its first draw must use the loaded fonts.
export async function loadGameFonts(): Promise<void> {
    await Promise.allSettled([
        document.fonts.load('16px Kavoon'),
        document.fonts.load('600 16px "Crimson Pro"'),
    ]);
}
