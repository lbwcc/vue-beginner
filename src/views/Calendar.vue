<template>
  <div class="calendar-container">
    <div style="display:flex;justify-content:space-between;align-items:center;position:relative;padding:18px 0 18px 0;">
      <button @click="goBack" style="margin-right: 16px;vertical-align:middle;font-size:16px;padding:7px 18px;">返回</button>
      <h2 @click="toggleViewMode" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);margin:0;font-size:26px;letter-spacing:2px;cursor:pointer;user-select:none;" title="切换视图">日历<span style="font-size:11px;opacity:0.38;margin-left:3px;vertical-align:middle;">{{ viewMode==='month'?'月':'日' }}</span></h2>
      <div class="calendar-top-right">
        <Clock :embedded="true" />
      </div>
    </div>
      <template v-if="viewMode === 'month'">
      <div class="calendar">
        <div class="calendar-header">
          <button @click="prevMonth"> < </button>
          <span>{{ year }}年{{ month + 1 }}月</span>
          <button @click="nextMonth"> > </button>
        </div>
        <div class="calendar-grid" @click.self="resetEnlargedDay">
          <div class="calendar-cell header" v-for="d in weekDays" :key="d">{{ d }}</div>
          <div
            v-for="(day, idx) in days"
            :key="idx"
            class="calendar-cell"
            :class=" [
              { today: isToday(day), marked: isMarked(day), holiday: isHoliday(day)?.type === 'holiday', workday: isHoliday(day)?.type === 'work', 'cell-disabled': day <= 0 },
              isMarked(day) && marks[`${year}-${month + 1}-${day}`] ? 'has-remark' : ''
            ]"
            @click="day > 0 && handleCellClick(day)"
            :tabindex="day > 0 ? 0 : -1"
            style="user-select: none;"
          >
            <template v-if="false">
              <!-- 放大功能已移除 -->
            </template>
            <template v-else>
              <span class="cell-day-num">{{ day > 0 ? day : '' }}</span>
              <span v-if="day > 0" class="cell-lunar-day">{{ getCellLunar(day) }}</span>
              <div v-if="isHoliday(day) && day > 0" class="holiday-label-full">{{ isHoliday(day).name }}</div>
              <div v-if="getWeatherIcon(day) && day > 0" class="weather-icon">
                <img :src="getWeatherIcon(day)" alt="weather" />
              </div>
            </template>
          </div>
        </div>
      </div>
      <div v-if="dialogDay > 0 && dialogLunarData" class="lunar-panel">
        <!-- 公历日期 + 公历节日 -->
        <div class="dialog-header">
          <span class="dialog-solar-date">{{ year }}年{{ month + 1 }}月{{ dialogDay }}日</span>
          <span v-if="dialogLunarData.solarFestivals?.length" class="dialog-solar-festival">
            {{ dialogLunarData.solarFestivals.join('  ') }}
          </span>
        </div>
        <!-- 农历日期 + 农历节日 + 节气 -->
        <div class="dialog-lunar-row">
          <span class="dialog-lunar-date">
            农历{{ dialogLunarData.lunarMon }}月{{ dialogLunarData.lunarDay }}
          </span>
          <span v-if="dialogLunarData.lunarFestivals?.length" class="dialog-lunar-festival">
            {{ dialogLunarData.lunarFestivals.join('  ') }}
          </span>
          <span v-if="dialogLunarData.jieQi" class="dialog-jieqi">{{ dialogLunarData.jieQi }}</span>
        </div>
        <!-- 干支纪年 -->
        <div class="dialog-ganzhi">
          {{ dialogLunarData.yearGanZhi }}年（{{ dialogLunarData.zodiac }}年）
          {{ dialogLunarData.monthGanZhi }}月 {{ dialogLunarData.dayGanZhi }}日
        </div>
        <!-- 宜忌 -->
        <div class="dialog-yi-ji">
          <div class="dialog-yi">
            <span class="yiji-label yi-label">宜</span>
            <span class="yiji-content">{{ dialogLunarData.yi?.slice(0, 6).join('  ') || '无' }}</span>
          </div>
          <div class="dialog-ji">
            <span class="yiji-label ji-label">忌</span>
            <span class="yiji-content">{{ dialogLunarData.ji?.slice(0, 6).join('  ') || '无' }}</span>
          </div>
        </div>
      </div>
      <div v-if="selectedDay > 0" class="remark-panel">
        <h3>备注 {{ year }}-{{ month + 1 }}-{{ selectedDay }}</h3>
        <!-- 天气信息显示 -->
        <div v-if="selectedDayWeather" class="weather-info">
          <div class="weather-main">
            <img :src="`https://icons.qweather.com/assets/icons/${selectedDayWeather.iconDay}.svg`" alt="weather icon" class="weather-icon-small" />
            <span class="weather-text">{{ selectedDayWeather.textDay }}</span>
            <span class="weather-temp">{{ selectedDayWeather.tempMin }}°C ~ {{ selectedDayWeather.tempMax }}°C</span>
          </div>
          <div class="weather-details">
            <span>湿度: {{ selectedDayWeather.humidity }}%</span>
            <span>风速: {{ selectedDayWeather.windSpeedDay }}km/h</span>
          </div>
        </div>
        <div v-else-if="weatherLoading" class="weather-loading">加载天气信息中...</div>
        <div v-else class="weather-error">暂无天气信息</div>
        <textarea v-model="remark" placeholder="输入备注..." rows="3"></textarea>
        <button @click="saveRemark">保存</button>
        <button @click="clearRemark">清除</button>
      </div>
      </template><!-- end month view -->

      <!-- 单日视图 -->
      <div v-else class="day-view" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
        <div class="day-view-nav">
          <button @click="prevDay" class="day-nav-btn">&#8249;</button>
          <span class="day-view-nav-date">{{ year }}年{{ month + 1 }}月</span>
          <button @click="nextDay" class="day-nav-btn">&#8250;</button>
        </div>
        <!-- 大日期卡片 -->
        <div class="day-card" :class="{ 'day-card-holiday-bg': isHoliday(selectedDay)?.type === 'holiday', 'day-card-workday-bg': isHoliday(selectedDay)?.type === 'work', 'day-card-today-bg': isToday(selectedDay) }">
          <div class="day-card-main">
            <div class="day-card-num">{{ selectedDay }}</div>
            <div class="day-card-meta">
              <div class="day-card-week">星期{{ weekDays[dayOfWeek] }}</div>
              <div v-if="isToday(selectedDay)" class="day-card-today-tag">今天</div>
              <div class="day-card-lunar" v-if="dialogLunarData">
                农历{{ dialogLunarData.lunarMon }}月{{ dialogLunarData.lunarDay }}
              </div>
              <div v-if="dialogLunarData?.jieQi" class="day-card-jieqi">{{ dialogLunarData.jieQi }}</div>
              <div v-if="isHoliday(selectedDay)" class="day-card-holiday-tag" :class="isHoliday(selectedDay).type">
                {{ isHoliday(selectedDay).name }}
              </div>
              <div class="day-card-zodiac">
                <span class="zodiac-symbol">{{ getZodiac(month + 1, selectedDay).symbol }}</span>
                {{ getZodiac(month + 1, selectedDay).name }}
              </div>
            </div>
          </div>
          <div class="day-card-festivals" v-if="dialogLunarData && (dialogLunarData.solarFestivals?.length || dialogLunarData.lunarFestivals?.length)">
            <span v-for="f in [...(dialogLunarData.solarFestivals||[]), ...(dialogLunarData.lunarFestivals||[])]" :key="f" class="day-festival-tag">{{ f }}</span>
          </div>
        </div>
        <!-- 干支纪年 -->
        <div class="day-ganzhi-row" v-if="dialogLunarData">
          {{ dialogLunarData.yearGanZhi }}年（{{ dialogLunarData.zodiac }}年）· {{ dialogLunarData.monthGanZhi }}月 · {{ dialogLunarData.dayGanZhi }}日
        </div>
        <!-- 宜忌 -->
        <div class="day-yi-ji" v-if="dialogLunarData">
          <div class="day-yiji-row">
            <span class="yiji-label yi-label">宜</span>
            <span class="yiji-content">{{ dialogLunarData.yi?.join('  ') || '无' }}</span>
          </div>
          <div class="day-yiji-row">
            <span class="yiji-label ji-label">忌</span>
            <span class="yiji-content">{{ dialogLunarData.ji?.join('  ') || '无' }}</span>
          </div>
        </div>
        <!-- 天气 -->
        <div v-if="selectedDayWeather" class="weather-info">
          <div class="weather-main">
            <img :src="`https://icons.qweather.com/assets/icons/${selectedDayWeather.iconDay}.svg`" alt="weather icon" class="weather-icon-small" />
            <span class="weather-text">{{ selectedDayWeather.textDay }}</span>
            <span class="weather-temp">{{ selectedDayWeather.tempMin }}°C ~ {{ selectedDayWeather.tempMax }}°C</span>
          </div>
          <div class="weather-details">
            <span>湿度: {{ selectedDayWeather.humidity }}%</span>
            <span>风速: {{ selectedDayWeather.windSpeedDay }}km/h</span>
          </div>
        </div>
        <div v-else-if="weatherLoading" class="weather-loading">加载天气信息中...</div>
        <!-- 备注 -->
        <div class="remark-panel">
          <textarea v-model="remark" placeholder="输入备注..." rows="3"></textarea>
          <button @click="saveRemark">保存</button>
          <button @click="clearRemark">清除</button>
        </div>
      </div>
  </div>
</template>

<script>
import { fetchHolidayList } from '../api/holidayApi';
import { getWeatherForecast } from '../api/weatherApi';
import { deleteCalendarNoteApi, listCalendarNotesApi, saveCalendarNoteApi } from '../api/calendarApi';
import { Solar } from 'lunar-javascript';
import Clock from '../components/Clock.vue';
import { getCurrentAccount } from '../utils/auth';
export default {
  name: 'Calendar',
  components: {
    Clock,
  },
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
      holidaysLoaded: false,
      showDialog: false,
      dialogDay: 0,
      dialogRemark: '',
      lunarInfo: '',
      dialogLunarData: null,
      viewMode: 'month', // 'month' | 'day'
      touchStartX: 0,
      user: null,
      currentLocation: '',
      // 天气相关
      weatherData: null,
      weatherLoading: false,
      selectedDayWeather: null, // 当前选中日期的天气信息
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
    dayOfWeek() {
      if (!this.selectedDay) return 0;
      return new Date(this.year, this.month, this.selectedDay).getDay();
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
      const entry = this.marks[`${this.year}-${this.month + 1}-${day}`];
      // 兼容旧格式（纯字符串）和新格式（{text, weather}）
      this.remark = entry ? (typeof entry === 'object' ? entry.text : entry) : '';
      // 优先用实时预报天气；若该日不在预报范围则尝试用存储天气
      const forecast = this.getWeatherInfo(day);
      if (forecast) {
        this.selectedDayWeather = forecast;
      } else if (entry && typeof entry === 'object' && entry.weather) {
        this.selectedDayWeather = entry.weather;
      } else {
        this.selectedDayWeather = null;
      }
    },
    async saveRemark() {
      if (!this.requireLoginForRemark()) return;
      if (this.selectedDay <= 0) return;
      const key = `${this.year}-${this.month + 1}-${this.selectedDay}`;
      if (this.remark.trim()) {
        const t = new Date();
        const isToday =
          t.getFullYear() === this.year &&
          t.getMonth() === this.month &&
          t.getDate() === this.selectedDay;
        if (isToday && this.selectedDayWeather) {
          // 今天：连同天气一起存储
          this.marks[key] = { text: this.remark.trim(), weather: this.selectedDayWeather };
        } else {
          this.marks[key] = this.remark.trim();
        }
      } else {
        delete this.marks[key];
      }

      const weatherPayload = this.selectedDayWeather ? this.selectedDayWeather : null;
      try {
        await saveCalendarNoteApi({
          date: key,
          remark: this.remark.trim(),
          weatherJson: weatherPayload ? JSON.stringify(weatherPayload) : null,
          location: this.currentLocation || null,
        });
      } catch (e) {
        console.error('Failed to save note:', e);
      }
    },
    async clearRemark() {
      if (!this.requireLoginForRemark()) return;
      if (this.selectedDay <= 0) return;
      const key = `${this.year}-${this.month + 1}-${this.selectedDay}`;
      this.remark = '';
      delete this.marks[key];
      try {
        await deleteCalendarNoteApi(key);
      } catch (e) {
        console.error('Failed to delete note:', e);
      }
    },
    async fetchHolidays() {
      this.holidays = await fetchHolidayList(this.year);
    },
    // 获取天气数据
    async fetchWeather() {
      this.weatherLoading = true;
      try {
        // 获取当前位置
        const location = await this.getLocation();
        const res = await getWeatherForecast(location, '30d');
        this.weatherData = res.data;
        console.log('Weather data:', this.weatherData);
      } catch (e) {
        console.error('Failed to fetch weather:', e);
        this.weatherData = null;
      } finally {
        this.weatherLoading = false;
      }
    },
    // 获取地理位置
    async getLocation() {
      if (navigator.geolocation) {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            pos => {
              const { latitude, longitude } = pos.coords;
              const location = `${longitude},${latitude}`;
              this.currentLocation = location;
              resolve(location);
            },
            () => {
              // 定位失败，返回默认城市
              this.currentLocation = 'beijing';
              resolve('beijing');
            },
            { timeout: 5000 }
          );
        });
      } else {
        this.currentLocation = 'beijing';
        return 'beijing';
      }
    },
    // 获取指定日期的天气图标
    getWeatherIcon(day) {
      if (!this.weatherData || !this.weatherData.daily) return null;
      
      const targetDate = new Date(this.year, this.month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);
      
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays < this.weatherData.daily.length) {
        const weather = this.weatherData.daily[diffDays];
        return weather && weather.iconDay ? `https://icons.qweather.com/assets/icons/${weather.iconDay}.svg` : null;
      }
      return null;
    },
    // 获取指定日期的完整天气信息
    getWeatherInfo(day) {
      if (!this.weatherData || !this.weatherData.daily) return null;
      
      const targetDate = new Date(this.year, this.month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);
      
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays < this.weatherData.daily.length) {
        return this.weatherData.daily[diffDays];
      }
      return null;
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
    async loadNotesFromServer() {
      if (!this.user) return;
      try {
        const res = await listCalendarNotesApi();
        if (res?.data?.code !== 200 || !Array.isArray(res?.data?.data)) {
          return;
        }
        const map = {};
        for (const note of res.data.data) {
          const key = String(note.date || '').trim();
          if (!key) continue;
          const remark = String(note.remark || '');
          const weatherJson = String(note.weatherJson || '');
          if (weatherJson) {
            try {
              map[key] = { text: remark, weather: JSON.parse(weatherJson) };
            } catch (e) {
              map[key] = remark;
            }
          } else {
            map[key] = remark;
          }
        }
        this.marks = map;
      } catch (e) {
        console.error('Failed to load notes:', e);
      }
    },
    goBack() {
      window.history.back();
    },
    requireLoginForRemark() {
      if (this.user) return true;
      this.$router.push({ path: '/login', query: { redirect: this.$route.fullPath } });
      return false;
    },
    openDialog(day) {
      if (day <= 0) return;
      this.enlargedDay = this.enlargedDay === day ? null : day;
    },
    closeDialog() {
      this.showDialog = false;
    },
    resetEnlargedDay() {
      this.enlargedDay = null;
    },
    getEnlargedCellStyle(idx) {
      // 7列网格
      const col = idx % 7;
      const row = Math.floor(idx / 7);
      const cellSize = 36; // .calendar-cell高度
      const gap = 8; // .calendar-grid gap
      // 网格padding-top: 12px, padding-bottom: 0
      const gridPaddingLeft = 0;
      const gridPaddingTop = 12;
      // 计算理论left/top
      let left = col * (cellSize + gap) + gridPaddingLeft;
      let top = row * (cellSize + gap) + gridPaddingTop;
      // 限制最大left/top，防止超出grid边界
      const grid = document.querySelector('.calendar-grid');
      if (grid) {
        const gridRect = grid.getBoundingClientRect();
        const maxLeft = gridRect.width - cellSize;
        const maxTop = gridRect.height - cellSize;
        if (left > maxLeft) left = maxLeft;
        if (top > maxTop) top = maxTop;
      }
      return {
        position: 'absolute',
        left: left + 'px',
        top: top + 'px',
        width: cellSize + 'px',
        height: cellSize + 'px',
        pointerEvents: 'auto',
      };
    },
    // 获取农历简短信息
    getLunar(y, m, d) {
      try {
        const solar = Solar.fromYmd(y, m, d);
        const lunar = solar.getLunar();
        // getMonthInChinese() 已自动含"闰"前缀
        return `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
      } catch (e) {
        return '';
      }
    },
    // 日历格子中显示的农历文字（节气优先，初一显示月名）
    getCellLunar(day) {
      if (day <= 0) return '';
      try {
        const solar = Solar.fromYmd(this.year, this.month + 1, day);
        const lunar = solar.getLunar();
        const jieQi = lunar.getJieQi();
        if (jieQi) return jieQi;
        const dayInChinese = lunar.getDayInChinese();
        if (dayInChinese === '初一') {
          // getMonthInChinese() 已含"闰"前缀
          return lunar.getMonthInChinese() + '月';
        }
        return dayInChinese;
      } catch (e) {
        return '';
      }
    },
    // 获取完整黄历数据（用于面板）
    getLunarData(y, m, d) {
      try {
        const solar = Solar.fromYmd(y, m, d);
        const lunar = solar.getLunar();
        return {
          yearGanZhi: lunar.getYearInGanZhi(),
          monthGanZhi: lunar.getMonthInGanZhi(),
          dayGanZhi: lunar.getDayInGanZhi(),
          zodiac: lunar.getYearShengXiao(),
          lunarMon: lunar.getMonthInChinese(), // 已含"闰"前缀
          lunarDay: lunar.getDayInChinese(),
          isLeapMonth: lunar.getMonth() < 0,
          jieQi: lunar.getJieQi(),
          yi: lunar.getDayYi(),
          ji: lunar.getDayJi(),
          lunarFestivals: lunar.getFestivals(),
          solarFestivals: solar.getFestivals(),
        };
      } catch (e) {
        return null;
      }
    },
    handleCellClick(day) {
      if (day <= 0) return;
      this.selectDay(day);
      this.dialogDay = day;
      const entry = this.marks[`${this.year}-${this.month + 1}-${day}`];
      this.dialogRemark = entry ? (typeof entry === 'object' ? entry.text : entry) : '';
      this.dialogLunarData = this.getLunarData(this.year, this.month + 1, day);
    },
    setTheme(themeName) {
      import('../utils/theme').then(theme => {
        if (theme && typeof theme.applyTheme === 'function' && Array.isArray(theme.themes)) {
          const themeObj = theme.themes.find(t => t.key === themeName);
          if (themeObj) {
            theme.applyTheme(themeObj);
            localStorage.setItem('calendar-theme', themeName);
          }
        }
      });
    },
    toggleViewMode() {
      if (this.viewMode === 'day') {
        this.viewMode = 'month';
      } else {
        this.viewMode = 'day';
        if (!this.selectedDay) {
          const t = new Date();
          this.year = t.getFullYear();
          this.month = t.getMonth();
          this.handleCellClick(t.getDate());
        } else {
          this.handleCellClick(this.selectedDay);
        }
      }
    },
    prevDay() {
      const d = new Date(this.year, this.month, this.selectedDay - 1);
      const prevYear = this.year;
      this.year = d.getFullYear();
      this.month = d.getMonth();
      if (this.year !== prevYear) this.fetchHolidays();
      this.handleCellClick(d.getDate());
    },
    nextDay() {
      const d = new Date(this.year, this.month, this.selectedDay + 1);
      const prevYear = this.year;
      this.year = d.getFullYear();
      this.month = d.getMonth();
      if (this.year !== prevYear) this.fetchHolidays();
      this.handleCellClick(d.getDate());
    },
    onTouchStart(e) {
      this.touchStartX = e.touches[0].clientX;
    },
    onTouchEnd(e) {
      const dx = e.changedTouches[0].clientX - this.touchStartX;
      if (Math.abs(dx) > 50) {
        if (dx < 0) this.nextDay();
        else this.prevDay();
      }
    },
    getZodiac(m, d) {
      const signs = [
        { name: '摩羯座', symbol: '♑', end: [1, 19] },
        { name: '水瓶座', symbol: '♒', end: [2, 18] },
        { name: '双鱼座', symbol: '♓', end: [3, 20] },
        { name: '白羊座', symbol: '♈', end: [4, 19] },
        { name: '金牛座', symbol: '♉', end: [5, 20] },
        { name: '双子座', symbol: '♊', end: [6, 21] },
        { name: '巨蟹座', symbol: '♋', end: [7, 22] },
        { name: '狮子座', symbol: '♌', end: [8, 22] },
        { name: '处女座', symbol: '♍', end: [9, 22] },
        { name: '天秤座', symbol: '♎', end: [10, 23] },
        { name: '天蝎座', symbol: '♏', end: [11, 22] },
        { name: '射手座', symbol: '♐', end: [12, 21] },
        { name: '摩羯座', symbol: '♑', end: [12, 31] },
      ];
      for (const s of signs) {
        if (m < s.end[0] || (m === s.end[0] && d <= s.end[1])) return s;
      }
      return signs[0];
    },
  },
  mounted() {
    this.user = getCurrentAccount();
    if (this.user) {
      this.loadNotesFromServer();
    }
    this.fetchHolidays().then(() => {
      this.holidaysLoaded = true;
    });

    // 获取天气数据
    this.fetchWeather();
  },
};
</script>

<style scoped>
/* 主题色变量补充说明：
  --remark-text: 备注内容色
  --remark-empty: 备注为空时的提示色
  --lunar-text: 农历色
  --dialog-text: 弹窗内容色
  --dialog-empty: 弹窗无备注色
*/
.calendar-container {
  max-width: 420px;
  height: auto;
  padding: 24px 18px 24px 18px;
  background: var(--bg-main);
  border-radius: 18px;
  box-shadow: 0 8px 32px var(--shadow, #e0e6ed);
  /* 让内容区和背景色对齐 calendar-header、calendar-grid、remark-panel、marked-list 统一背景色 */
  box-sizing: border-box;
}
@media (min-width: 1000px) {
  .calendar-container {
    max-width: 700px;
    min-width: 480px;
    min-height: 700px;
    height: auto;
    padding: 48px 56px 40px 56px;
    border-radius: 28px;
    box-shadow: 0 16px 56px var(--shadow, #e0e6edcc);
    margin: 40px auto;
  }
}
.calendar-header,
.calendar-grid,
.remark-panel {
  background: var(--bg-main);
}

.calendar-top-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 96px;
}
.calendar-header {
  color: var(--main-text);
  border-radius: 12px 12px 0 0;
  padding: 12px 0 10px 0;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
}
.calendar-header button {
  font-size: 20px;
  border-radius: 8px;
  padding: 4px 14px;
  border: none;
  margin: 0 10px;
  background: var(--button);
  color: var(--button-text);
  box-shadow: 0 1px 2px var(--shadow-btn, #e0e6ed33);
  transition: background 0.18s, color 0.18s;
}
.calendar-header button:hover, .calendar-header button:focus {
  background: var(--button-hover);
}
.calendar-header button:active {
  background: var(--button-active);
  color: #fff;
}
.calendar-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  padding: 12px 0 0 0;
  border-radius: 0 0 12px 12px;
  min-height: 420px;
  align-items: stretch;
  justify-items: center;
}
.calendar-cell {
  color: var(--main-text);
  width: 48px;
  height: 64px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: box-shadow 0.18s, background 0.18s, transform 0.18s;
  cursor: pointer;
  box-shadow: 0 1px 2px var(--shadow-btn, #e0e6ed33);
  position: relative;
  user-select: none;
  margin: 0;
  padding: 2px 0;
}
.cell-day-num {
  font-size: 16px;
  line-height: 1.2;
}
.cell-lunar-day {
  font-size: 10px;
  color: var(--lunar-text, #999);
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  letter-spacing: 0;
}
.calendar-cell.header {
  background: var(--header);
  color: var(--header-text, var(--main-text));
  font-weight: bold;
  font-size: 16px;
  border-radius: 8px;
  box-shadow: none;
  cursor: default;
  align-items: center;
  justify-content: center;
  display: flex;
  height: 40px;
  min-width: 48px;
  margin: 0;
  padding: 0;
}
.calendar-cell.today {
  border: 2px solid var(--today-border);
  background: var(--today);
  color: var(--today-border);
  font-weight: bold;
}
.calendar-cell.marked {
  background: var(--marked);
  color: var(--marked-text);
  font-weight: bold;
}
.calendar-cell.marked.has-remark {
  background: var(--remarked);
  color: var(--remarked-text);
}
.calendar-cell.holiday {
  background: var(--holiday);
  color: var(--holiday-text);
  border: 1.5px solid var(--holiday-border);
}
.calendar-cell.workday {
  background: var(--workday);
  color: var(--workday-text);
  border: 1.5px solid var(--workday-border);
}
.calendar-cell:not(.header):hover {
  box-shadow: 0 4px 16px var(--hover-shadow, #e9546b22);
  background: var(--cell-hover, #fffbe6);
}
.holiday-label-full {
  font-size: 11px;
  color: var(--holiday-text);
  margin-top: 2px;
  font-weight: bold;
  letter-spacing: 0.5px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  line-height: 1.1;
}
.weather-icon {
  margin-top: 2px;
}
.weather-icon img {
  width: 20px;
  height: 20px;
  opacity: 0.8;
}
.remark-panel {
  margin-top: 22px;
  background: var(--remark-panel, #fffbe6);
  border-radius: 10px;
  padding: 14px 18px 12px 18px;
  box-shadow: 0 2px 8px var(--shadow, #e0e6ed33);
}
.weather-info {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid var(--input-border, #ddd);
}
.weather-main {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.weather-icon-small {
  width: 24px;
  height: 24px;
  margin-right: 8px;
}
.weather-text {
  font-size: 16px;
  font-weight: bold;
  margin-right: 12px;
  color: var(--main-text, #333);
}
.weather-temp {
  font-size: 14px;
  color: var(--button, #007aff);
}
.weather-details {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: var(--main-text, #666);
}
.weather-loading {
  text-align: center;
  color: var(--main-text, #666);
  font-size: 14px;
  margin-bottom: 12px;
}
.weather-error {
  text-align: center;
  color: #ff4d4f;
  font-size: 14px;
  margin-bottom: 12px;
}
button {
  background: var(--button);
  color: var(--button-text);
  border-radius: 8px;
  border: none;
  padding: 7px 18px;
  font-size: 16px;
  margin: 0 8px 8px 0;
  box-shadow: 0 1px 2px var(--shadow-btn, #e0e6ed33);
  transition: background 0.18s, color 0.18s;
}
button:hover, button:focus {
  background: var(--button-hover);
}
button:active {
  background: var(--button-active);
  color: #fff;
}
textarea {
  background: var(--input-bg);
  color: var(--main-text);
  border: 1.5px solid var(--input-border);
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 16px;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 10px;
}
textarea:focus {
  border-color: var(--input-focus);
}
.lunar-panel {
  margin-top: 18px;
  background: var(--remark-panel, #fffbe6);
  border-radius: 12px;
  padding: 16px 20px 14px 20px;
  box-shadow: 0 2px 8px var(--shadow, #e0e6ed33);
}
/* ===== 单日视图 ===== */
.day-view {
  padding-top: 4px;
}
.day-view-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.day-view-nav-date {
  font-size: 17px;
  font-weight: bold;
  color: var(--main-text);
  letter-spacing: 1px;
}
.day-nav-btn {
  font-size: 32px;
  line-height: 1;
  padding: 2px 14px 4px 14px;
  background: var(--button);
  color: var(--button-text);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 1px 2px var(--shadow-btn, #e0e6ed33);
  transition: background 0.15s;
}
.day-nav-btn:hover { background: var(--button-hover); }
.day-nav-btn:active { background: var(--button-active); color: #fff; }
.day-card {
  background: var(--bg-cell, #f6e0b3);
  border-radius: 18px;
  padding: 20px 22px 16px 22px;
  margin-bottom: 14px;
  box-shadow: 0 4px 18px var(--shadow, #e0e6ed44);
  transition: background 0.2s;
}
.day-card-today-bg {
  background: var(--today, #fff2e2);
  border: 2px solid var(--today-border, #e9546b);
}
.day-card-holiday-bg {
  background: var(--holiday, #f8d0d6);
}
.day-card-workday-bg {
  background: var(--workday, #e9f1f6);
}
.day-card-main {
  display: flex;
  align-items: center;
  gap: 18px;
}
.day-card-num {
  font-size: 96px;
  font-weight: bold;
  color: var(--today-border, #e9546b);
  line-height: 1;
  min-width: 100px;
  text-align: center;
}
.day-card-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.day-card-week {
  font-size: 22px;
  font-weight: bold;
  color: var(--main-text);
}
.day-card-today-tag {
  display: inline-block;
  font-size: 14px;
  color: #fff;
  background: var(--today-border, #e9546b);
  border-radius: 4px;
  padding: 2px 10px;
  font-weight: bold;
}
.day-card-lunar {
  font-size: 16px;
  color: var(--lunar-text, #888);
}
.day-card-jieqi {
  display: inline-block;
  font-size: 14px;
  color: #4caf50;
  background: rgba(76,175,80,0.12);
  border-radius: 4px;
  padding: 2px 10px;
  font-weight: bold;
}
.day-card-holiday-tag {
  display: inline-block;
  font-size: 13px;
  border-radius: 4px;
  padding: 2px 10px;
}
.day-card-holiday-tag.holiday {
  background: var(--holiday, #f8d0d6);
  color: var(--holiday-text, #e9546b);
  border: 1px solid var(--holiday-border, #e9546b);
}
.day-card-holiday-tag.work {
  background: var(--workday, #e9f1f6);
  color: var(--workday-text, #177cb0);
  border: 1px solid var(--workday-border, #177cb0);
}
.day-card-zodiac {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 15px;
  color: var(--main-text);
  font-weight: 500;
}
.zodiac-symbol {
  font-size: 22px;
  line-height: 1;
}
.day-card-festivals {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}
.day-festival-tag {
  font-size: 14px;
  color: #e9546b;
  background: rgba(233,84,107,0.1);
  border-radius: 5px;
  padding: 3px 12px;
}
.day-ganzhi-row {
  font-size: 15px;
  color: var(--lunar-text, #999);
  text-align: center;
  margin-bottom: 14px;
  letter-spacing: 1px;
}
.day-yi-ji {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
  background: var(--remark-panel, #fffbe6);
  border-radius: 10px;
  padding: 14px 18px;
  box-shadow: 0 2px 8px var(--shadow, #e0e6ed33);
}
.day-yiji-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 15px;
  line-height: 1.7;
}
.dialog-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.dialog-solar-date {
  font-size: 18px;
  font-weight: bold;
  color: var(--main-text);
}
.dialog-solar-festival {
  font-size: 13px;
  color: #e9546b;
}
.dialog-lunar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 4px 0 4px 0;
}
.dialog-lunar-date {
  font-size: 14px;
  color: var(--lunar-text, #888);
}
.dialog-lunar-festival {
  font-size: 13px;
  color: #e9546b;
  font-weight: bold;
}
.dialog-jieqi {
  font-size: 13px;
  color: #4caf50;
  background: rgba(76, 175, 80, 0.12);
  border-radius: 4px;
  padding: 1px 7px;
  font-weight: bold;
}
.dialog-ganzhi {
  font-size: 13px;
  color: var(--lunar-text, #999);
  margin: 4px 0 10px 0;
  letter-spacing: 1px;
}
.dialog-yi-ji {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
  text-align: left;
}
.dialog-yi,
.dialog-ji {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.6;
}
.yiji-label {
  display: inline-block;
  min-width: 22px;
  text-align: center;
  border-radius: 4px;
  font-size: 13px;
  font-weight: bold;
  padding: 1px 4px;
  flex-shrink: 0;
  margin-top: 1px;
}
.yi-label {
  background: #e8f5e9;
  color: #388e3c;
  border: 1px solid #a5d6a7;
}
.ji-label {
  background: #fce4ec;
  color: #c62828;
  border: 1px solid #f48fb1;
}
.yiji-content {
  color: var(--main-text);
  flex: 1;
}
@keyframes popIn {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
@media (max-width: 600px) {
  .calendar-container {
    max-width: 100vw;
    padding: 10px 2vw 10px 2vw;
    border-radius: 0;
    box-shadow: none;
  }
  .calendar-header {
    font-size: 16px;
    padding: 8px 0 6px 0;
    gap: 10px;
  }
  .calendar-header button {
    font-size: 16px;
    padding: 2px 8px;
    margin: 0 4px;
  }
  .calendar-grid {
    gap: 4px;
    padding: 6px 0 0 0;
    border-radius: 0 0 8px 8px;
    min-height: 280px;
    align-items: stretch;
    justify-items: center;
  }
  .calendar-cell {
    width: 36px;
    height: 52px;
    font-size: 13px;
    border-radius: 6px;
    margin: 0;
    padding: 2px 0;
  }
  .cell-day-num {
    font-size: 13px;
  }
  .cell-lunar-day {
    font-size: 9px;
    width: 34px;
    max-width: 34px;
  }
  .calendar-cell.header {
    font-size: 13px;
    border-radius: 6px;
    height: 32px;
    min-width: 36px;
    margin: 0;
    padding: 0;
  }
  .holiday-label-full {
    font-size: 10px;
    margin-top: 1px;
  }
  .weather-icon {
    margin-top: 1px;
  }
  .weather-icon img {
    width: 16px;
    height: 16px;
    opacity: 0.8;
  }
  .remark-panel, .lunar-panel {
    padding: 8px 10px 8px 10px;
    border-radius: 6px;
    margin-top: 12px;
  }
  .weather-info {
    padding: 8px;
    margin-bottom: 8px;
  }
  .weather-main {
    margin-bottom: 6px;
  }
  .weather-icon-small {
    width: 20px;
    height: 20px;
    margin-right: 6px;
  }
  .weather-text {
    font-size: 14px;
    margin-right: 8px;
  }
  .weather-temp {
    font-size: 13px;
  }
  .weather-details {
    gap: 12px;
    font-size: 13px;
  }
  button {
    font-size: 13px;
    padding: 5px 10px;
    border-radius: 6px;
    margin: 0 4px 6px 0;
  }
  textarea {
    font-size: 13px;
    padding: 5px 6px;
    border-radius: 6px;
  }
  .calendar-dialog {
    min-width: 0;
    max-width: 98vw;
    padding: 18px 6vw 14px 6vw;
    border-radius: 8px;
  }
  .auth-panel {
    padding: 16px;
    border-radius: 10px;
    background: var(--bg-main);
    box-shadow: 0 4px 16px var(--shadow, #e0e6ed);
    margin-top: 24px;
  }
  .auth-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .auth-form input {
    padding: 10px;
    font-size: 16px;
    border: 1.5px solid var(--input-border);
    border-radius: 8px;
    width: 100%;
    box-sizing: border-box;
  }
  .auth-form button {
    padding: 10px;
    font-size: 16px;
    border-radius: 8px;
    border: none;
    background: var(--button);
    color: var(--button-text);
    transition: background 0.18s, color 0.18s;
  }
  .auth-form button:hover, .auth-form button:focus {
    background: var(--button-hover);
  }
  .auth-form button:active {
    background: var(--button-active);
    color: #fff;
  }
  .auth-switch {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
  }
  .auth-error {
    color: var(--error);
    font-size: 14px;
    text-align: center;
  }
  .login-panel {
    max-width: 340px;
    margin: 60px auto 0 auto;
    background: var(--bg-main);
    border-radius: 14px;
    box-shadow: 0 4px 24px var(--shadow, #e0e6ed55);
    padding: 32px 28px 24px 28px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .login-panel > button[style] {
    align-self: flex-start;
    margin-bottom: 18px;
    margin-left: -4px;
    padding: 6px 18px;
    font-size: 15px;
    border-radius: 8px;
    background: var(--button);
    color: var(--button-text);
    border: none;
    box-shadow: 0 1px 2px var(--shadow-btn, #e0e6ed33);
    transition: background 0.18s, color 0.18s;
  }
  .login-panel > button[style]:hover,
  .login-panel > button[style]:focus {
    background: var(--button-hover);
  }
  .login-panel > button[style]:active {
    background: var(--button-active);
    color: #fff;
  }
  .login-panel h2 {
    margin-bottom: 18px;
    color: var(--main-text);
    font-size: 26px;
    font-weight: bold;
    letter-spacing: 2px;
  }
  .login-panel form {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: stretch;
  }
  .login-panel input {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    font-size: 16px;
    border: 1.5px solid var(--input-border);
    border-radius: 8px;
    background: var(--input-bg);
    color: var(--main-text);
    transition: border-color 0.18s;
    margin: 0;
  }
  .login-panel button[type="submit"] {
    width: 100%;
    margin: 0;
    background: var(--button);
    color: var(--button-text);
    border: none;
    border-radius: 8px;
    padding: 10px 0;
    font-size: 18px;
    font-weight: bold;
    margin-top: 6px;
    box-shadow: 0 1px 2px var(--shadow-btn, #e0e6ed33);
    transition: background 0.18s, color 0.18s;
  }
  .login-panel button[type="submit"]:hover,
  .login-panel button[type="submit"]:focus {
    background: var(--button-hover);
  }
  .login-panel button[type="submit"]:active {
    background: var(--button-active);
    color: #fff;
  }
  .login-panel .auth-switch {
    margin-top: 16px;
    text-align: center;
    font-size: 15px;
    width: 100%;
  }
  .login-panel .auth-switch a {
    color: var(--button);
    text-decoration: underline;
    cursor: pointer;
    margin-left: 2px;
    font-size: 15px;
    transition: color 0.18s;
  }
  .login-panel .auth-switch a:hover {
    color: var(--button-active);
    text-decoration: underline;
  }
  .login-panel div[style*="color:red"] {
    color: #e9546b !important;
    font-size: 15px;
    min-height: 22px;
    margin-bottom: 2px;
    text-align: center;
    width: 100%;
  }
  .calendar-cell.cell-disabled {
    pointer-events: none;
    background: transparent;
    box-shadow: none;
    color: transparent;
    cursor: default;
  }
  .calendar-cell.cell-disabled span {
    color: transparent;
  }
}
/* PC端登录面板样式优化 */
@media (min-width: 601px) {
  .login-panel.pc-login-panel {
    max-width: 400px;
    margin: 100px auto 0 auto;
    background: var(--bg-main);
    border-radius: 18px;
    box-shadow: 0 12px 40px var(--shadow, #e0e6ed88);
    padding: 48px 44px 32px 44px;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 420px;
  }
  .login-panel.pc-login-panel h2 {
    margin-bottom: 28px;
    color: var(--main-text);
    font-size: 32px;
    font-weight: bold;
    letter-spacing: 2px;
  }
  .login-panel.pc-login-panel form {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 22px;
    align-items: stretch;
  }
  .login-panel.pc-login-panel input {
    width: 100%;
    box-sizing: border-box;
    padding: 14px 16px;
    font-size: 18px;
    border: 1.5px solid var(--input-border);
    border-radius: 8px;
    background: var(--input-bg);
    color: var(--main-text);
    transition: border-color 0.18s;
    margin: 0;
  }
  .login-panel.pc-login-panel button[type="submit"] {
    width: 100%;
    margin: 0;
    background: var(--button);
    color: var(--button-text);
    border: none;
    border-radius: 8px;
    padding: 14px 0;
    font-size: 20px;
    font-weight: bold;
    margin-top: 10px;
    box-shadow: 0 1px 2px var(--shadow-btn, #e0e6ed33);
    transition: background 0.18s, color 0.18s;
  }
  .login-panel.pc-login-panel button[type="submit"]:hover,
  .login-panel.pc-login-panel button[type="submit"]:focus {
    background: var(--button-hover);
  }
  .login-panel.pc-login-panel button[type="submit"]:active {
    background: var(--button-active);
    color: #fff;
  }
  .login-panel.pc-login-panel .auth-switch,
  .login-panel.pc-login-panel div[style*="margin-top:10px"] {
    margin-top: 22px !important;
    text-align: center;
    font-size: 17px;
    width: 100%;
  }
  .login-panel.pc-login-panel a {
    font-size: 17px;
  }
}
</style>
