export type CurrencyItem = {
  code: string;
  symbol: string;
  label: string;
};

export type CountryItem = {
  code: string;
  name: string;
  flag: string;
  defaultCurrency: string;
};

export const CURRENCIES: CurrencyItem[] = [
  { code: "USD", symbol: "$", label: "USD ($)" },
  { code: "EUR", symbol: "€", label: "EUR (€)" },
  { code: "GBP", symbol: "£", label: "GBP (£)" },
  { code: "CAD", symbol: "C$", label: "CAD (C$)" },
  { code: "AUD", symbol: "A$", label: "AUD (A$)" },
  { code: "JPY", symbol: "¥", label: "JPY (¥)" },
  { code: "INR", symbol: "₹", label: "INR (₹)" },
  { code: "SGD", symbol: "S$", label: "SGD (S$)" },
  { code: "CHF", symbol: "CHF", label: "CHF (CHF)" },
  { code: "NZD", symbol: "NZ$", label: "NZD (NZ$)" },
  { code: "BRL", symbol: "R$", label: "BRL (R$)" },
  { code: "MXN", symbol: "MX$", label: "MXN (MX$)" },
  { code: "ZAR", symbol: "R", label: "ZAR (R)" },
  { code: "AED", symbol: "د.إ", label: "AED (د.إ)" },
  { code: "SAR", symbol: "SR", label: "SAR (SR)" },
  { code: "BDT", symbol: "৳", label: "BDT (৳)" },
  { code: "PKR", symbol: "₨", label: "PKR (₨)" },
];

export const COUNTRIES: CountryItem[] = [
  { code: "US", name: "United States", flag: "🇺🇸", defaultCurrency: "USD" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", defaultCurrency: "GBP" },
  { code: "EU", name: "Eurozone (General)", flag: "🇪🇺", defaultCurrency: "EUR" },
  { code: "CA", name: "Canada", flag: "🇨🇦", defaultCurrency: "CAD" },
  { code: "AU", name: "Australia", flag: "🇦🇺", defaultCurrency: "AUD" },
  { code: "JP", name: "Japan", flag: "🇯🇵", defaultCurrency: "JPY" },
  { code: "IN", name: "India", flag: "🇮🇳", defaultCurrency: "INR" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", defaultCurrency: "SGD" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", defaultCurrency: "CHF" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", defaultCurrency: "NZD" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", defaultCurrency: "BRL" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", defaultCurrency: "MXN" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", defaultCurrency: "ZAR" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", defaultCurrency: "AED" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", defaultCurrency: "SAR" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", defaultCurrency: "BDT" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", defaultCurrency: "PKR" },
];

export function getCurrencySymbol(code: string | null | undefined): string {
  if (!code) return "$";
  const currency = CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
  return currency ? currency.symbol : "$";
}

export function formatCurrency(amount: number, currencyCode: string | null | undefined): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
