/**
 * 标题默认样式配置
 * 多行标题按照奇偶行交替颜色
 */

export interface TitleLineStyle {
  textColor: string;
  outlineColor: string;
  outlineWidth: number;
}

/**
 * 奇数行样式：白色文字 + 红色描边
 */
const ODD_LINE_STYLE: TitleLineStyle = {
  textColor: '#FFFFFF',
  outlineColor: '#FF0000',
  outlineWidth: 2
};

/**
 * 偶数行样式：红色文字 + 白色描边
 */
const EVEN_LINE_STYLE: TitleLineStyle = {
  textColor: '#FF0000',
  outlineColor: '#FFFFFF',
  outlineWidth: 2
};

/**
 * 根据行号获取标题行样式
 * @param lineIndex 行索引（0-based）
 * @returns 行样式配置
 */
export function getTitleLineStyle(lineIndex: number): TitleLineStyle {
  return lineIndex % 2 === 0 ? ODD_LINE_STYLE : EVEN_LINE_STYLE;
}

/**
 * 将标题文本按换行符拆分，返回每行的样式配置
 * @param title 标题文本
 * @returns 每行的样式数组
 */
export function getTitleLineStyles(title: string): TitleLineStyle[] {
  const lines = title.split('\n').filter(line => line.trim().length > 0);
  return lines.map((_, index) => getTitleLineStyle(index));
}

/**
 * 获取第一行样式（默认样式）
 */
export function getFirstLineStyle(): TitleLineStyle {
  return ODD_LINE_STYLE;
}
