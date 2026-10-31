// Supabase returns English messages; these are the ones a user can cause.
export function authErrorMessage(message: string) {
  if (message.includes('Invalid login credentials')) return 'המייל או הסיסמה לא נכונים.';
  if (message.includes('already registered')) return 'כבר יש חשבון עם המייל הזה. אפשר להתחבר.';
  if (message.includes('Email not confirmed')) return 'צריך קודם לאשר את המייל. הקישור נשלח לתיבת הדואר שלך.';
  if (message.includes('should be different')) return 'הסיסמה החדשה צריכה להיות שונה מהקודמת.';
  if (message.includes('Password should be')) return 'הסיסמה צריכה להכיל לפחות 6 תווים.';
  if (message.includes('valid email') || message.includes('invalid format'))
    return 'כתובת המייל לא תקינה.';
  if (message.includes('rate limit')) return 'נשלחו יותר מדי בקשות. כדאי לנסות שוב בעוד כמה דקות.';
  return 'משהו השתבש. כדאי לנסות שוב.';
}
