import Phaser from 'phaser';
import { ensureTextures } from '../juice.js';

/** 공용 텍스처 생성 후 대기하는 부트 씬 */
export default class Boot extends Phaser.Scene {
  constructor() {
    super({ key: 'boot' });
  }
  create() {
    ensureTextures(this);
  }
}
