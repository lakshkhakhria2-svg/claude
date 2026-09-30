import { Composition } from 'remotion';
import './fonts.css';
import { Showreel, TOTAL } from './Showreel';

export const RemotionRoot = () => (
  <Composition id="Showreel" component={Showreel} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
);
