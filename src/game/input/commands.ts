export type GameCommand = 'rewind' | 'restart' | 'interact' | 'reverseWind';
export type SoundInput = Readonly<{
    pulse?: 'soft' | 'loud';
    sustained: boolean;
}>;
