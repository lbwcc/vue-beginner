// src/api/holidayApi.js

/**
 * 获取指定年份和月份的节假日数据
 * @param {number} year 年份
 * @param {number} month 月份（1-12）
 * @returns {Promise<Array>} 节假日数组
 */
export async function fetchHolidayList(year) {
  const cacheKey = `holiday-${year}`;
  let holidays = JSON.parse(localStorage.getItem(cacheKey) || 'null');
  if (!Array.isArray(holidays) || holidays.length === 0) holidays = null;
  if (!holidays) {
    try {
      // timor.tech API: https://timor.tech/api/holiday/year/{year}
      const url = `https://timor.tech/api/holiday/year/${year}`;
      const resp = await fetch(url);
      const data = await resp.json();
      holidays = [];
      if (data && data.holiday && typeof data.holiday === 'object') {
        for (const key in data.holiday) {
          if (Object.prototype.hasOwnProperty.call(data.holiday, key)) {
            const item = data.holiday[key];
            // 处理 date 字段为 'YYYY-M-D' 格式
            const d = new Date(item.date);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            const day = d.getDate();
            holidays.push({
              date: `${y}-${m}-${day}`,
              type: item.holiday ? 'holiday' : 'work',
              name: item.name + (item.holiday === false && item.name.includes('补班') ? '（补班）' : '')
            });
          }
        }
      }
      localStorage.setItem(cacheKey, JSON.stringify(holidays));
    } catch (e) {
      holidays = [];
      // 可选：console.error('获取节假日失败', e);
    }
  }
  return holidays;
}
