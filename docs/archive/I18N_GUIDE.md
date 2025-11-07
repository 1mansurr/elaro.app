# Internationalization (i18n) Guide

## Overview

This guide documents the internationalization infrastructure, locale support, and translation patterns in the ELARO app. The i18n system is set up to support multiple languages and RTL (right-to-left) layouts.

---

## Current Status

### ✅ Implemented

- Basic i18n infrastructure
- Locale context and provider
- Locale detection and management
- RTL support detection
- Date/number/currency formatting utilities

### 🔜 Future Implementation

- Translation file system
- i18next/react-i18next integration
- Translation loading and caching
- Dynamic locale switching
- Translation key management

---

## Locale Support

### Supported Locales

Currently configured for:

- **English (en)** - Default
- **Spanish (es)** - Planned
- **French (fr)** - Planned
- **Arabic (ar)** - Planned (RTL support)

### Adding New Locales

To add a new locale:

1. Add to `SupportedLocale` type in `src/i18n/index.ts`:

```typescript
export type SupportedLocale = 'en' | 'es' | 'fr' | 'ar' | 'de'; // Add 'de' for German
```

2. Add to `LOCALES` constant:

```typescript
export const LOCALES = {
  // ... existing
  GERMAN: 'de' as SupportedLocale,
};
```

3. Add to `LOCALE_NAMES`:

```typescript
export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  // ... existing
  de: 'Deutsch',
};
```

4. If RTL, add to `isRTL()` function:

```typescript
const rtlLocales: SupportedLocale[] = ['ar', 'he']; // Add Hebrew if needed
```

---

## Usage

### Using Locale Context

```typescript
import { useLocale } from '@/contexts/LocaleContext';

const MyComponent = () => {
  const { locale, setLocale, isRTL, localeNames } = useLocale();

  return (
    <View>
      <Text>Current locale: {locale}</Text>
      <Text>RTL: {isRTL ? 'Yes' : 'No'}</Text>

      <TouchableOpacity onPress={() => setLocale('es')}>
        <Text>Switch to Spanish</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### Formatting Numbers

```typescript
import { formatNumber } from '@/i18n';

const formatted = formatNumber(1234.56); // "1,234.56" (en) or "1.234,56" (es)
const percentage = formatNumber(0.75, { style: 'percent' }); // "75%"
```

### Formatting Dates

```typescript
import { formatDate } from '@/i18n';

const formatted = formatDate(new Date()); // Locale-specific date
const shortDate = formatDate(new Date(), { dateStyle: 'short' });
const longDate = formatDate(new Date(), { dateStyle: 'long' });
```

### Formatting Currency

```typescript
import { formatCurrency } from '@/i18n';

const usd = formatCurrency(19.99, 'USD'); // "$19.99"
const eur = formatCurrency(19.99, 'EUR'); // "€19.99"
```

### Translation Function (Future)

```typescript
import { t } from '@/i18n';

// Future implementation
const message = t('welcome.message', { name: 'John' });
// Translation key: "welcome.message": "Welcome, {{name}}!"
// Result: "Welcome, John!"
```

---

## RTL Support

### Automatic RTL Detection

RTL is automatically detected based on locale:

```typescript
import { isRTL } from '@/i18n';

const rtl = isRTL('ar'); // true
const rtl2 = isRTL('en'); // false
```

### RTL Layout Considerations

When implementing RTL support:

1. **Use Flexbox Direction:**

   ```typescript
   <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
   ```

2. **Flip Icons:**

   ```typescript
   <Ionicons
     name={isRTL ? 'chevron-back' : 'chevron-forward'}
   />
   ```

3. **Adjust Text Alignment:**

   ```typescript
   <Text style={{ textAlign: isRTL ? 'right' : 'left' }}>
   ```

4. **Use I18nManager:**

   ```typescript
   import { I18nManager } from 'react-native';

   I18nManager.forceRTL(isRTL);
   ```

### RTL Testing

Test RTL layouts with Arabic locale:

```typescript
const { setLocale } = useLocale();
setLocale('ar'); // Switch to Arabic (RTL)
```

---

## Best Practices

### ✅ DO

1. **Use Locale-Aware Formatting**
   - Always use `formatDate()`, `formatNumber()`, `formatCurrency()`
   - Don't hardcode date/number formats

2. **Provide Default Locale**
   - Always have English as fallback
   - Handle missing translations gracefully

3. **Consider RTL Early**
   - Design layouts to work in both LTR and RTL
   - Test with RTL languages

4. **Use Translation Keys**
   - Don't hardcode strings
   - Use descriptive translation keys

5. **Test Locale Changes**
   - Test all locales before release
   - Verify formatting works correctly

### ❌ DON'T

1. **Don't Hardcode Formats**

   ```typescript
   // ❌ BAD
   const date = `${month}/${day}/${year}`;

   // ✅ GOOD
   const date = formatDate(new Date(), { dateStyle: 'short' });
   ```

2. **Don't Hardcode Currency Symbols**

   ```typescript
   // ❌ BAD
   const price = `$${amount}`;

   // ✅ GOOD
   const price = formatCurrency(amount, 'USD');
   ```

3. **Don't Ignore RTL**
   - Always consider RTL layouts
   - Test with Arabic or Hebrew

---

## Future Implementation

### Translation File Structure

Future structure for translation files:

```
src/i18n/
├── index.ts              # Main i18n config
├── locales/
│   ├── en.json          # English translations
│   ├── es.json          # Spanish translations
│   ├── fr.json          # French translations
│   └── ar.json          # Arabic translations
└── types.ts              # Type definitions
```

### Translation File Example

```json
// locales/en.json
{
  "welcome": {
    "title": "Welcome to ELARO",
    "message": "Welcome, {{name}}!",
    "button": "Get Started"
  },
  "errors": {
    "network": "Network error. Please check your connection.",
    "auth": "Authentication failed. Please try again."
  }
}
```

### Using i18next (Future)

```typescript
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();

  return (
    <Text>{t('welcome.title')}</Text>
  );
};
```

---

## Troubleshooting

### Issue: Locale not changing

**Solution:**

1. Check LocaleProvider is in AppProviders
2. Verify setLocale is called correctly
3. Check console for locale change logs

### Issue: RTL not working

**Solution:**

1. Verify I18nManager.forceRTL is set
2. Check if app restart is needed
3. Verify locale is RTL locale ('ar', 'he')

### Issue: Formatting not locale-aware

**Solution:**

1. Use i18n utilities (formatDate, formatNumber)
2. Don't use native toLocaleString directly
3. Verify locale is set correctly

---

## Related Documentation

- [Accessibility Guide](./ACCESSIBILITY_GUIDE.md)
- [React Native i18n](https://reactnative.dev/docs/internationalization)
- [i18next Documentation](https://www.i18next.com/)

---

**Last Updated:** Phase 6 Implementation  
**Status:** Infrastructure Ready (Translation system to be implemented)
