export type GameCommand = 'activateBridge' | 'rewind' | 'restart' | 'interact';
export type SoundInput = Readonly<{
    pulse?: 'soft' | 'loud';
    sustained: boolean;
}>;
