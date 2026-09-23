/** Structured file validation remains translatable while a dialog is open. */
export class FileValidationError extends Error {
  constructor(message: string, readonly reason: 'size' | 'type', readonly value: number | string) {
    super(message);
    this.name = 'FileValidationError';
  }
}
