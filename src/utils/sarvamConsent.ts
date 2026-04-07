import { useSettingsStore } from '../store/useSettingsStore';
import { useSarvamConsentStore } from '../store/useSarvamConsentStore';

/**
 * Gate every Sarvam AI call through this helper.
 *
 * If the user has previously granted consent, resolves `true` immediately.
 * Otherwise, displays the SarvamConsentModal and resolves with the user's
 * choice. Granting consent persists the decision so future calls do not
 * re-prompt until the user revokes from Settings.
 */
export async function ensureSarvamConsent(): Promise<boolean> {
  const { sarvamConsentGranted, setSarvamConsent } = useSettingsStore.getState();
  if (sarvamConsentGranted) return true;

  const granted = await useSarvamConsentStore.getState().request();
  if (granted) setSarvamConsent(true);
  return granted;
}
