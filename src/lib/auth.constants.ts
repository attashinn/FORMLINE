/** Shown for all login failures (wrong credentials, lockout, rate limit). */
export const AUTH_LOGIN_ERROR = "Incorrect email or password";

/** Shown for all registration failures; never confirms whether an email exists. */
export const AUTH_REGISTRATION_ERROR =
  "Unable to create your account. Please check your details and try again.";

/** Shown when a password reset is requested (always, regardless of email registration). */
export const AUTH_PASSWORD_RESET_MESSAGE =
  "If that email is registered, you'll receive a reset link";
