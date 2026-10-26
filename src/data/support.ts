export interface SupportLine {
  name: string;
  phone?: string;
  text?: string;
  url: string;
}

export interface CountrySupport {
  code: string;
  label: string;
  emergency: string;
  lines: SupportLine[];
}

export const SUPPORT: CountrySupport[] = [
  {
    code: 'UK', label: 'United Kingdom', emergency: '999',
    lines: [
      { name: 'Samaritans', phone: '116 123', url: 'https://www.samaritans.org' },
      { name: 'Shout', text: 'Text SHOUT to 85258', url: 'https://giveusashout.org' },
    ],
  },
  {
    code: 'IE', label: 'Ireland', emergency: '112 or 999',
    lines: [
      { name: 'Samaritans', phone: '116 123', url: 'https://www.samaritans.org/ireland' },
      { name: 'Text About It', text: 'Text HELLO to 50808', url: 'https://text50808.ie' },
    ],
  },
  {
    code: 'US', label: 'United States', emergency: '911',
    lines: [{ name: '988 Suicide & Crisis Lifeline', phone: '988', text: 'Text 988', url: 'https://988lifeline.org' }],
  },
  {
    code: 'CA', label: 'Canada', emergency: '911',
    lines: [{ name: '9-8-8 Suicide Crisis Helpline', phone: '988', text: 'Text 988', url: 'https://988.ca' }],
  },
  {
    code: 'AU', label: 'Australia', emergency: '000',
    lines: [{ name: 'Lifeline', phone: '13 11 14', url: 'https://www.lifeline.org.au' }],
  },
  {
    code: 'NZ', label: 'New Zealand', emergency: '111',
    lines: [{ name: 'Need to talk?', phone: '1737', text: 'Text 1737', url: 'https://1737.org.nz' }],
  },
  {
    code: 'OTHER', label: 'Somewhere else', emergency: 'your local emergency number',
    lines: [{ name: 'Find A Helpline', url: 'https://findahelpline.com' }],
  },
];
