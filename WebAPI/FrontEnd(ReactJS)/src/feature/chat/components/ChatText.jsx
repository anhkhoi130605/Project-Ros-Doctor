import React from 'react';

export default function ChatText({ text }) {
  const content = String(text ?? '');
  const parts = [];
  const urls = /https?:\/\/[^\s<>"'`“”‘’]+/gi;
  let cursor = 0;

  for (const match of content.matchAll(urls)) {
    let href = match[0].replace(/[.,;:!?]+$/, '');
    // Keep balanced brackets inside URLs, but leave sentence/Markdown endings outside.
    for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}']]) {
      while (href.endsWith(close) && href.split(close).length > href.split(open).length) {
        href = href.slice(0, -1);
      }
    }
    try {
      const parsed = new URL(href);
      if (!['http:', 'https:'].includes(parsed.protocol)) continue;
    } catch {
      continue;
    }
    parts.push(content.slice(cursor, match.index));
    parts.push(
      <a key={match.index} className="chat-message-link" href={href} target="_blank" rel="noopener noreferrer">
        {href}
      </a>
    );
    cursor = match.index + href.length;
  }

  parts.push(content.slice(cursor));
  return <>{parts}</>;
}
