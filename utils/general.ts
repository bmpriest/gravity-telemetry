export function italicize(text: string): [string, boolean][] {
  return text.split(/("[^"]*")/g).map((part) => {
    if (part.startsWith('"') && part.endsWith('"')) return [part, true];
    return [part, false];
  });
}
