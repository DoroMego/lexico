export interface AdjectiveForms {
  mSg: string;
  fSg: string;
  mPl: string;
  fPl: string;
}

const DEACCENT: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' };
function deaccent(s: string) { return s.replace(/[áéíóú]/g, (c) => DEACCENT[c] ?? c); }

export function inflectAdjective(adj: string): AdjectiveForms | null {
  // -o: otro → otra, otros, otras
  if (adj.endsWith('o')) {
    const stem = adj.slice(0, -1);
    return { mSg: adj, fSg: stem + 'a', mPl: adj + 's', fPl: stem + 'as' };
  }

  // -or: trabajador → trabajadora, trabajadores, trabajadoras
  if (adj.endsWith('or')) {
    return { mSg: adj, fSg: adj + 'a', mPl: adj + 'es', fPl: adj + 'as' };
  }

  // Stressed endings: inglés → inglesa; holgazán → holgazana
  if (adj.endsWith('és') || /[áéíóú]n$/.test(adj)) {
    const base = deaccent(adj);
    return { mSg: adj, fSg: base + 'a', mPl: base + 'es', fPl: base + 'as' };
  }

  // -z: feliz → feliz/feliz/felices/felices
  if (adj.endsWith('z')) {
    const pl = adj.slice(0, -1) + 'ces';
    return { mSg: adj, fSg: adj, mPl: pl, fPl: pl };
  }

  // -e or other vowel (not -o): invariable gender, add -s
  if (/[aeiu]$/.test(adj)) {
    return { mSg: adj, fSg: adj, mPl: adj + 's', fPl: adj + 's' };
  }

  // Consonant ending: invariable gender, add -es
  if (/[^aeiouáéíóú]$/.test(adj)) {
    return { mSg: adj, fSg: adj, mPl: adj + 'es', fPl: adj + 'es' };
  }

  return null;
}

export function formatAdjectiveForms(forms: AdjectiveForms): string {
  const invariable = forms.fSg === forms.mSg && forms.fPl === forms.mPl;
  if (invariable) return `${forms.mSg} / ${forms.mPl}`;
  return `${forms.mSg} → ${forms.fSg} / ${forms.mPl} / ${forms.fPl}`;
}
