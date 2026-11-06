/**
 * Algebraic Result pattern implementation for explicit domain error handling.
 * Principle V of project constitution: no unhandled/generic exceptions for business rules.
 */

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({
  ok: true,
  value
});

export const err = <E>(error: E): Result<never, E> => ({
  ok: false,
  error
});

export const isOk = <T, E>(result: Result<T, E>): result is { readonly ok: true; readonly value: T } => {
  return result.ok === true;
};

export const isErr = <T, E>(result: Result<T, E>): result is { readonly ok: false; readonly error: E } => {
  return result.ok === false;
};

