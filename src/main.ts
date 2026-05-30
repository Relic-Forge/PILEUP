import Phaser from 'phaser';
import './styles.css';
import { gameConfig } from './config/gameConfig';

const game = new Phaser.Game(gameConfig);

if (import.meta.env.DEV) {
  window.__PILEUP_GAME__ = game;
}
