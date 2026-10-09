export function toggleMarkdownTask(value: string, taskIndex: number, checked: boolean) {
  let currentIndex = -1;
  return value.replace(/^([ \t]*[-*+]\s+\[)([ xX])([\]])/gm, (match, before: string, _state: string, after: string) => {
    currentIndex++;
    return currentIndex === taskIndex ? `${before}${checked ? "x" : " "}${after}` : match;
  });
}
