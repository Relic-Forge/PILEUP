import type Phaser from 'phaser';

interface StoppablePointerEvent {
  stopPropagation?: () => void;
}

export const captureUiPointer = (pointer?: Phaser.Input.Pointer, event?: StoppablePointerEvent): void => {
  event?.stopPropagation?.();
  document.body.dataset.pileupUiPointerActive = '1';
  if (pointer) {
    document.body.dataset.pileupUiPointerId = String(pointer.id);
  }
};

export const releaseUiPointerCapture = (): void => {
  document.body.dataset.pileupUiPointerActive = '0';
  delete document.body.dataset.pileupUiPointerId;
};

export const isUiPointerCaptured = (): boolean =>
  document.body.dataset.pileupBackpackOpen === '1' || document.body.dataset.pileupUiPointerActive === '1';
