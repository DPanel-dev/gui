export function getTextHead(text: string, count = 2): string {
  if (!text || typeof text !== 'string') return '';

  // 步骤1：用正则拆分单词（支持 camelCase, kebab-case, snake_case, 空格）
  const words = text
    .trim()
    .split(/(?=[A-Z])|[-_\s]/) // 在大写字母前、或 `-`, `_`, 空格处分割
    .map(part => part.trim())
    .filter(part => part.length > 0);

  // 如果没拆出来（比如全小写连续字母），直接取前 count 个字母
  if (words.length <= 1 && words[0] === text) {
    return text.slice(0, count).toUpperCase();
  }

  // 多个部分：取每个部分的首字母
  return words
    .map(word => word[0]) // 每个部分取第一个字母
    .join('')
    .slice(0, count) // 最多保留 count 个字母
    .toUpperCase(); // 转大写输出
}