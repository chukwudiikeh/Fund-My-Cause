// Mock for next-intl in Jest tests
// useTranslations returns a function that returns the key path as a string
const useTranslations = (namespace?: string) => (key: string, values?: Record<string, unknown>) => {
  const full = namespace ? `${namespace}.${key}` : key;
  if (!values) return full;
  return Object.entries(values).reduce(
    (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
    full,
  );
};

const useLocale = () => "en";

const NextIntlClientProvider = ({ children }: { children: React.ReactNode }) => children;

module.exports = { useTranslations, useLocale, NextIntlClientProvider };
