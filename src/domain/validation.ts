import { ZodError } from 'zod';

/** Convierte cualquier error (Zod, Error o desconocido) en un mensaje legible. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? 'Revisa los datos ingresados';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocurrió un error inesperado';
}
