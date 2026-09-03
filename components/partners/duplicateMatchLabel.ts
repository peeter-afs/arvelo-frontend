// Literal keys, not template strings: next-intl types t() against the message
// catalogue, so a computed key would force an `any` cast.
const MATCH_TYPE_KEY = {
  same_registry_code_same_role: 'duplicateSameRegistryCodeSameRole',
  same_registry_code_other_role: 'duplicateSameRegistryCodeOtherRole',
  same_name_possible_duplicate: 'duplicateSameName',
  same_vat_possible_duplicate: 'duplicateSameVat',
  same_iban_possible_duplicate: 'duplicateSameIban',
} as const;

type MatchTypeKey = keyof typeof MATCH_TYPE_KEY;

/** Human-readable reason a partner looks like a duplicate. */
export function duplicateMatchLabel(
  t: (key: (typeof MATCH_TYPE_KEY)[MatchTypeKey]) => string,
  matchType: string
): string {
  const key = MATCH_TYPE_KEY[matchType as MatchTypeKey];
  // An unrecognised reason is still better shown raw than swallowed.
  return key ? t(key) : matchType;
}
