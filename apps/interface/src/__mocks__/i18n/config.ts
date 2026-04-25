export const locales = ["en", "es", "fr", "ar", "he"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const rtlLocales: Locale[] = ["ar", "he"];
export const localeNames = {
  en: "English",
  es: "Español",
  fr: "Français",
  ar: "العربية",
  he: "עברית",
};
