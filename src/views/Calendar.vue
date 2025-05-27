<template>
  <div class="calendar-container">
    <h2>日历</h2>
    <div class="calendar">
      <div class="calendar-header">
        <button @click="prevMonth">《</button>
        <span>{{ year }}年{{ month + 1 }}月</span>
        <button @click="nextMonth">》</button>
      </div>
      <div class="calendar-grid">
        <div class="calendar-cell header" v-for="d in weekDays" :key="d">{{ d }}</div>
        <div
          v-for="(day, idx) in days"
          :key="idx"
          class="calendar-cell"
          :class="{ today: isToday(day), marked: isMarked(day), holiday: isHoliday(day)?.type === 'holiday', workday: isHoliday(day)?.type === 'work' }"
          @click="selectDay(day)"
        >
          <span>{{ day > 0 ? day : '' }}</span>
          <div v-if="isHoliday(day) && day > 0" class="holiday-label-full">{{ isHoliday(day).name }}</div>
        </div>
      </div>
    </div>
    <div v-if="selectedDay > 0" class="remark-panel">
      <h3>备注 {{ year }}-{{ month + 1 }}-{{ selectedDay }}</h3>
      <textarea v-model="remark" placeholder="输入备注..." rows="3"></textarea>
      <button @click="saveRemark">保存</button>
      <button @click="clearRemark">清除</button>
    </div>
    <div class="marked-list" v-if="Object.keys(filteredMarks).length">
      <h3>已标记日期</h3>
      <ul>
        <li v-for="(text, key) in filteredMarks" :key="key">
          {{ key }}: {{ text }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { fetchHolidayList } from '../api/holidayApi';
export default {
  name: 'Calendar',
  data() {
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth(),
      selectedDay: 0,
      remark: '',
      marks: {},
      holidays: [],
      weekDays: ['日', '一', '二', '三', '四', '五', '六'],
      holidaysLoaded: false, // 新增标志
    };
  },
  computed: {
    days() {
      const firstDay = new Date(this.year, this.month, 1).getDay();
      const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();
      const arr = [];
      for (let i = 0; i < firstDay; i++) arr.push(0);
      for (let d = 1; d <= daysInMonth; d++) arr.push(d);
      while (arr.length % 7 !== 0) arr.push(0);
      return arr;
    },
    monthKey() {
      return `${this.year}-${this.month + 1}`;
    },
    holidayMap() {
      // 以"YYYY-M-D"为key，内容为{type: 'holiday'|'work', name: 节日名}
      return this.holidays.reduce((map, h) => {
        map[h.date] = h;
        return map;
      }, {});
    },
    filteredMarks() {
      const prefix = `${this.year}-${this.month + 1}-`;
      return Object.fromEntries(
        Object.entries(this.marks)
          .filter(([k]) => k.startsWith(prefix))
          .sort((a, b) => {
            const dayA = parseInt(a[0].split('-')[2], 10);
            const dayB = parseInt(b[0].split('-')[2], 10);
            return dayA - dayB;
          })
      );
    },
  },
  methods: {
    isToday(day) {
      const t = new Date();
      return (
        day > 0 &&
        t.getFullYear() === this.year &&
        t.getMonth() === this.month &&
        t.getDate() === day
      );
    },
    isMarked(day) {
      if (day <= 0) return false;
      return this.marks[`${this.year}-${this.month + 1}-${day}`];
    },
    isHoliday(day) {
      if (day <= 0) return null;
      return this.holidayMap[`${this.year}-${this.month + 1}-${day}`] || null;
    },
    selectDay(day) {
      if (day <= 0) return;
      this.selectedDay = day;
      this.remark = this.marks[`${this.year}-${this.month + 1}-${day}`] || '';
    },
    saveRemark() {
      if (this.selectedDay <= 0) return;
      const key = `${this.year}-${this.month + 1}-${this.selectedDay}`;
      if (this.remark.trim()) {
        this.marks[key] = this.remark.trim();
      } else {
        delete this.marks[key];
      }
      this.saveToStorage();
    },
    clearRemark() {
      if (this.selectedDay <= 0) return;
      const key = `${this.year}-${this.month + 1}-${this.selectedDay}`;
      this.remark = '';
      delete this.marks[key];
      this.saveToStorage();
    },
    async fetchHolidays() {
      this.holidays = await fetchHolidayList(this.year);
    },
    prevMonth() {
      if (this.month === 0) {
        this.year--;
        this.month = 11;
      } else {
        this.month--;
      }
      this.selectedDay = 0;
      this.remark = '';
      this.fetchHolidays();
    },
    nextMonth() {
      if (this.month === 11) {
        this.year++;
        this.month = 0;
      } else {
        this.month++;
      }
      this.selectedDay = 0;
      this.remark = '';
      this.fetchHolidays();
    },
    saveToStorage() {
      localStorage.setItem('calendar-marks', JSON.stringify(this.marks));
    },
    loadFromStorage() {
      const data = localStorage.getItem('calendar-marks');
      if (data) {
        this.marks = JSON.parse(data);
      }
    },
  },
  mounted() {
    this.loadFromStorage();
    this.fetchHolidays().then(() => {
      this.holidaysLoaded = true;
    });
  },
};
</script>

<style scoped>
.calendar-container {
  max-width: 400px;
  margin: 30px auto;
  padding: 20px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px #eee;
}
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.calendar-cell {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f7f7f7;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
}
.calendar-cell.header {
  background: #e0e0e0;
  font-weight: bold;
  cursor: default;
}
.calendar-cell.today {
  border: 2px solid #42b983;
}
.calendar-cell.marked {
  background: #ffe082;
}
.calendar-cell.holiday {
  background: #ffebee;
  color: #d32f2f;
  border: 1.5px solid #d32f2f;
}
.calendar-cell.workday {
  background: #e3f2fd;
  color: #1976d2;
  border: 1.5px solid #1976d2;
}
.holiday-label {
  position: absolute;
  left: 2px;
  bottom: 2px;
  font-size: 10px;
  background: rgba(255,255,255,0.7);
  border-radius: 2px;
  padding: 0 2px;
  pointer-events: none;
}
.holiday-label-full {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 2px;
  font-size: 11px;
  color: #d32f2f;
  background: rgba(255,255,255,0.85);
  border-radius: 2px;
  padding: 0 2px;
  text-align: center;
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.remark-panel {
  margin-top: 20px;
}
.marked-list {
  margin-top: 20px;
  font-size: 14px;
}
</style>
