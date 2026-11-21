import MarkdownDisplay from 'react-native-markdown-display';

import { openExternalLink } from '../lib/links';
import { typography, useThemeColors } from '../theme';

type Props = { children: string };

/** Render markdown z motywem aplikacji. Linki otwierane w przeglądarce w aplikacji. */
export function Markdown({ children }: Props) {
  const c = useThemeColors();
  return (
    <MarkdownDisplay
      onLinkPress={(url) => {
        void openExternalLink(url);
        return false;
      }}
      style={{
        body: { ...typography.body, color: c.baseContent },
        heading1: { ...typography.title, color: c.baseContent, marginTop: 8, marginBottom: 4 },
        heading2: { ...typography.heading, color: c.baseContent, marginTop: 12, marginBottom: 4 },
        heading3: { ...typography.subheading, color: c.baseContent, marginTop: 8, marginBottom: 2 },
        strong: { fontWeight: '700' },
        link: { color: c.primary, textDecorationLine: 'underline' },
        bullet_list: { marginVertical: 4 },
        ordered_list: { marginVertical: 4 },
        list_item: { marginVertical: 2 },
        blockquote: { backgroundColor: c.neutralSoft, borderLeftColor: c.base300, borderLeftWidth: 4, paddingHorizontal: 8 },
        code_inline: { backgroundColor: c.neutralSoft, color: c.baseContent },
        hr: { backgroundColor: c.base300 },
        paragraph: { marginTop: 4, marginBottom: 4 },
      }}>
      {children}
    </MarkdownDisplay>
  );
}
