export const POST_MIXED_V2_PREFIX = '#POST_MIXED_V2#'

/**
 * 解析 #POST_MIXED_V2# 格式，兼容两种 JSON 结构：
 *  - 数组格式（新）：[{"type":"text","content":"..."},{"type":"image","url":"..."}]
 *  - 对象格式（旧）：{"text":"...","images":[{"url":"...","thumbnailUrl":"..."}]}
 *
 * @param {string} rawContent
 * @returns {{ textBlocks: string[], imageItems: {url:string,thumbnailUrl:string}[] } | null}
 *   返回 null 表示不是 V2 格式或解析失败
 */
export function parsePostMixedV2(rawContent) {
  const source = String(rawContent || '')
  if (!source.startsWith(POST_MIXED_V2_PREFIX)) return null

  try {
    const parsed = JSON.parse(source.slice(POST_MIXED_V2_PREFIX.length).trim())

    // 数组格式：[{type, content|url, ...}]
    if (Array.isArray(parsed)) {
      return {
        textBlocks: parsed
          .filter((b) => b.type === 'text' && b.content)
          .map((b) => String(b.content)),
        imageItems: parsed
          .filter((b) => b.type === 'image' && b.url)
          .map((b) => ({ url: String(b.url), thumbnailUrl: String(b.thumbnailUrl || b.url) })),
      }
    }

    // 对象格式：{text, images:[{url, thumbnailUrl}]}
    if (parsed && typeof parsed === 'object') {
      return {
        textBlocks: parsed.text ? [String(parsed.text)] : [],
        imageItems: Array.isArray(parsed.images)
          ? parsed.images
              .filter((i) => i && i.url)
              .map((i) => ({ url: String(i.url), thumbnailUrl: String(i.thumbnailUrl || i.url) }))
          : [],
      }
    }
  } catch { /* 解析失败，返回 null */ }

  return null
}
