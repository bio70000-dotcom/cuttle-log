export const SPECIES_COLOR: Record<string, string> = {
  cuttle: '#e67e22',
  webfoot: '#e74c3c',
  bigfin: '#2980b9',
}

export const SPECIES_LABEL: Record<string, string> = {
  cuttle: '갑오징어',
  webfoot: '주꾸미',
  bigfin: '무늬오징어',
}

export const SPECIES_OPTIONS = [
  { value: 'cuttle', label: '갑오징어' },
  { value: 'webfoot', label: '주꾸미' },
  { value: 'bigfin', label: '무늬오징어' },
] as const
