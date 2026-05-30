import Phaser from 'phaser';

export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;
export const REFERENCE_ASPECT = DESIGN_WIDTH / DESIGN_HEIGHT;

export type ViewportClass =
  | 'phonePortrait'
  | 'phoneLandscape'
  | 'minimumWindow'
  | 'desktop1080'
  | 'desktopLarge'
  | 'ultrawide';

export interface SafeArea {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  marginX: number;
  marginY: number;
}

export interface ResponsiveLayout {
  viewportWidth: number;
  viewportHeight: number;
  aspect: number;
  viewportClass: ViewportClass;
  isPortrait: boolean;
  isTouch: boolean;
  isPhone: boolean;
  isUltrawide: boolean;
  worldViewWidth: number;
  worldViewHeight: number;
  uiScale: number;
  safeArea: SafeArea;
}

export class ResponsiveScaleSystem {
  private layout: ResponsiveLayout;
  private readonly resizeCallbacks = new Set<(layout: ResponsiveLayout) => void>();
  private portraitPrompt?: Phaser.GameObjects.Container;

  constructor(private readonly scene: Phaser.Scene) {
    this.layout = this.calculateLayout();
    this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
  }

  destroy(): void {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.resizeCallbacks.clear();
    this.portraitPrompt?.destroy();
  }

  getLayout(): ResponsiveLayout {
    return this.layout;
  }

  onResize(callback: (layout: ResponsiveLayout) => void): () => void {
    this.resizeCallbacks.add(callback);
    callback(this.layout);

    return () => {
      this.resizeCallbacks.delete(callback);
    };
  }

  ensurePortraitPrompt(): Phaser.GameObjects.Container {
    if (!this.portraitPrompt) {
      const shade = this.scene.add.rectangle(0, 0, 10, 10, 0x070608, 0.94).setOrigin(0, 0);
      const title = this.scene.add
        .text(0, 0, 'Rotate to play', {
          color: '#f4efe0',
          fontFamily: 'Georgia, serif',
          fontSize: '52px',
        })
        .setOrigin(0.5);
      const body = this.scene.add
        .text(0, 0, 'PILEUP uses a landscape view for this build.', {
          color: '#c7beb2',
          fontSize: '24px',
          align: 'center',
          wordWrap: { width: 420 },
        })
        .setOrigin(0.5);

      this.portraitPrompt = this.scene.add
        .container(0, 0, [shade, title, body])
        .setDepth(100_000)
        .setScrollFactor(0);
      this.portraitPrompt.setData('shade', shade);
      this.portraitPrompt.setData('title', title);
      this.portraitPrompt.setData('body', body);
    }

    this.layoutPortraitPrompt();
    return this.portraitPrompt;
  }

  refresh(): ResponsiveLayout {
    this.layout = this.calculateLayout();
    this.layoutPortraitPrompt();
    this.resizeCallbacks.forEach((callback) => callback(this.layout));
    return this.layout;
  }

  private handleResize(): void {
    this.refresh();
  }

  private calculateLayout(): ResponsiveLayout {
    const viewportWidth = this.scene.scale.gameSize.width;
    const viewportHeight = this.scene.scale.gameSize.height;
    const aspect = viewportWidth / viewportHeight;
    const isPortrait = viewportHeight > viewportWidth;
    const isTouch =
      this.scene.sys.game.device.input.touch || window.matchMedia('(pointer: coarse)').matches;
    const isPhone = isTouch && Math.min(viewportWidth, viewportHeight) < 900;
    const isUltrawide = aspect >= 2.1;
    const viewportClass = this.classifyViewport(viewportWidth, viewportHeight, aspect, isTouch);
    const hudMarginPercent = isPhone ? 0.09 : 0.05;
    const marginX = Math.max(24, viewportWidth * hudMarginPercent);
    const marginY = Math.max(24, viewportHeight * (isPhone ? 0.08 : 0.05));
    const worldViewHeight = DESIGN_HEIGHT;
    const worldViewWidth = Math.round(DESIGN_HEIGHT * aspect);
    const uiScale = this.calculateUiScale(viewportClass);

    return {
      viewportWidth,
      viewportHeight,
      aspect,
      viewportClass,
      isPortrait,
      isTouch,
      isPhone,
      isUltrawide,
      worldViewWidth,
      worldViewHeight,
      uiScale,
      safeArea: {
        left: marginX,
        right: viewportWidth - marginX,
        top: marginY,
        bottom: viewportHeight - marginY,
        width: viewportWidth - marginX * 2,
        height: viewportHeight - marginY * 2,
        marginX,
        marginY,
      },
    };
  }

  private classifyViewport(
    viewportWidth: number,
    viewportHeight: number,
    aspect: number,
    isTouch: boolean,
  ): ViewportClass {
    if (viewportHeight > viewportWidth) {
      return 'phonePortrait';
    }

    if (isTouch || viewportHeight < 720) {
      return 'phoneLandscape';
    }

    if (aspect >= 2.1) {
      return 'ultrawide';
    }

    if (viewportWidth < 1600) {
      return 'minimumWindow';
    }

    if (viewportWidth >= 2560) {
      return 'desktopLarge';
    }

    return 'desktop1080';
  }

  private calculateUiScale(viewportClass: ViewportClass): number {
    switch (viewportClass) {
      case 'phoneLandscape':
        return 0.9;
      case 'desktopLarge':
        return 1.15;
      case 'ultrawide':
        return 1.05;
      default:
        return 1;
    }
  }

  private layoutPortraitPrompt(): void {
    if (!this.portraitPrompt) {
      return;
    }

    const { viewportWidth, viewportHeight, isPortrait } = this.layout;
    const shade = this.portraitPrompt.getData('shade') as Phaser.GameObjects.Rectangle;
    const title = this.portraitPrompt.getData('title') as Phaser.GameObjects.Text;
    const body = this.portraitPrompt.getData('body') as Phaser.GameObjects.Text;
    const promptScale = Math.min(1, viewportWidth / 520);

    shade.setSize(viewportWidth, viewportHeight);
    title.setFontSize(Math.round(52 * promptScale));
    body.setFontSize(Math.round(24 * promptScale));
    body.setWordWrapWidth(Math.max(280, viewportWidth * 0.82));
    title.setPosition(viewportWidth / 2, viewportHeight * 0.42);
    body.setPosition(viewportWidth / 2, viewportHeight * 0.52);
    this.portraitPrompt.setVisible(isPortrait);
  }
}
