import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { GameOverScene } from '../scenes/GameOverScene';
import { LevelScene } from '../scenes/LevelScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { UIScene } from '../scenes/UIScene';
import { VictoryScene } from '../scenes/VictoryScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#09080a',
  width: 1920,
  height: 1080,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    LevelScene,
    UIScene,
    GameOverScene,
    VictoryScene,
  ],
};
