export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export const passValidation = (): ValidationResult => ({
  ok: true,
  errors: [],
});
