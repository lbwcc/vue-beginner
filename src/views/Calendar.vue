<template>
  <div class="calendar-container">
    <template v-if="showLogin">
      <div class="login-panel pc-login-panel">
        <button @click="showLogin = false" style="align-self:flex-start;margin-bottom:18px;">返回</button>
        <h2 v-if="!isRegister">登录</h2>
        <h2 v-else>注册</h2>
        <form @submit.prevent="isRegister ? register() : login()">
          <div>
            <input v-if="isRegister" v-model="registerForm.username" placeholder="用户名" />
            <input v-else v-model="loginForm.username" placeholder="用户名" />
          </div>
          <div>
            <input v-if="isRegister" v-model="registerForm.password" type="password" placeholder="密码" />
            <input v-else v-model="loginForm.password" type="password" placeholder="密码" />
          </div>
          <div style="color:red;min-height:22px;">{{ isRegister ? registerError : loginError }}</div>
          <button type="submit">{{ isRegister ? '注册' : '登录' }}</button>
        </form>
        <div style="margin-top:10px;">
          <a href="#" @click.prevent="isRegister = !isRegister">{{ isRegister ? '已有账号？去登录' : '没有账号？去注册' }}</a>
        </div>
      </div>
    </template>
    <template v-else>
      <div style="display:flex;justify-content:space-between;align-items:center;position:relative;padding:18px 0 18px 0;">
        <button @click="goBack" style="margin-right: 16px;vertical-align:middle;font-size:16px;padding:7px 18px;">返回</button>
        <h2 style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);margin:0;font-size:26px;letter-spacing:2px;">日历</h2>
        <div style="display:flex;align-items:center;gap:0;">
          <span v-if="user" style="margin-right:16px;font-size:16px;">{{ user.username }}</span>
          <button v-if="user" @click="logout" style="font-size:16px;padding:7px 18px;">退出</button>
          <button v-else @click="showLogin=true" style="font-size:16px;padding:7px 18px;">登录</button>
        </div>
      </div>
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
              <span>{{ day > 0 ? day : '' }}</span>
              <div v-if="isHoliday(day) && day > 0" class="holiday-label-full">{{ isHoliday(day).name }}</div>
            </template>
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
      <div v-if="showDialog" class="calendar-dialog-mask" @click.self="closeDialog">
        <div class="calendar-dialog">
          <h3>{{ year }}-{{ month + 1 }}-{{ dialogDay }}</h3>
          <div style="color:var(--lunar-text);">农历：{{ lunarInfo }}</div>
          <div v-if="dialogRemark" style="color:var(--dialog-text);">备注：{{ dialogRemark }}</div>
          <div v-else style="color:var(--dialog-empty);">暂无备注</div>
          <button @click="closeDialog" style="margin-top:16px;">关闭</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { fetchHolidayList } from '../api/holidayApi';
import solarlunar from 'solarlunar';
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
      holidaysLoaded: false,
      showDialog: false,
      dialogDay: 0,
      dialogRemark: '',
      lunarInfo: '',
      // 新增用户相关
      user: null, // 当前登录用户对象 {username, password}
      loginForm: { username: '', password: '' },
      registerForm: { username: '', password: '' },
      showLogin: true, // 是否显示登录/注册面板
      isRegister: false, // 是否显示注册
      loginError: '',
      registerError: '',
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
    // 用户注册
    register() {
      this.registerError = '';
      const { username, password } = this.registerForm;
      if (!username || !password) {
        this.registerError = '用户名和密码不能为空';
        return;
      }
      if (localStorage.getItem('user-' + username)) {
        this.registerError = '用户名已存在';
        return;
      }
      localStorage.setItem('user-' + username, JSON.stringify({ username, password }));
      // 生成token并保存
      const token = btoa(username + ':' + Date.now());
      localStorage.setItem('calendar-token', token);
      localStorage.setItem('calendar-token-user', username);
      this.user = { username, password };
      this.showLogin = false;
      this.isRegister = false;
      this.loginForm.username = username;
      this.loginForm.password = password;
      this.registerForm.username = '';
      this.registerForm.password = '';
      this.loginError = '';
      this.loadFromStorage();
    },
    // 用户登录
    login() {
      this.loginError = '';
      const { username, password } = this.loginForm;
      const userStr = localStorage.getItem('user-' + username);
      if (!userStr) {
        this.loginError = '用户不存在';
        return;
      }
      const user = JSON.parse(userStr);
      if (user.password !== password) {
        this.loginError = '密码错误';
        return;
      }
      // 生成token并保存
      const token = btoa(username + ':' + Date.now());
      localStorage.setItem('calendar-token', token);
      localStorage.setItem('calendar-token-user', username);
      this.user = user;
      this.showLogin = false;
      this.loadFromStorage();
    },
    // 退出登录
    logout() {
      this.user = null;
      this.showLogin = true;
      this.marks = {};
      this.selectedDay = 0;
      this.remark = '';
      localStorage.removeItem('calendar-token');
      localStorage.removeItem('calendar-token-user');
    },
    saveToStorage() {
      if (!this.user) return;
      localStorage.setItem('calendar-marks-' + this.user.username, JSON.stringify(this.marks));
    },
    loadFromStorage() {
      if (!this.user) return;
      const data = localStorage.getItem('calendar-marks-' + this.user.username);
      if (data) {
        this.marks = JSON.parse(data);
      } else {
        this.marks = {};
      }
    },
    goBack() {
      window.history.back();
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
    // 简单农历占位函数，可替换为第三方库
    getLunar(y, m, d) {
      // 使用 solarlunar 获取农历，防止非法日期报错
      try {
        const lunar = solarlunar.solar2lunar(y, m, d);
        if (lunar && lunar.lunarMonthCn && lunar.lunarDayCn) {
          return `农历${lunar.lunarMonthCn}${lunar.lunarDayCn}`;
        }
        return '';
      } catch (e) {
        return '';
      }
    },
    handleCellClick(day) {
      if (day <= 0) return;
      this.selectDay(day);
    },
    toggleRegister() {
      this.isRegister = !this.isRegister;
      this.loginError = '';
      this.registerError = '';
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
  },
  mounted() {
    // 进入页面自动验证token
    const token = localStorage.getItem('calendar-token');
    const username = localStorage.getItem('calendar-token-user');
    if (token && username) {
      const userStr = localStorage.getItem('user-' + username);
      if (userStr) {
        this.user = JSON.parse(userStr);
        this.showLogin = false;
        this.loadFromStorage();
        this.fetchHolidays().then(() => {
          this.holidaysLoaded = true;
        });
        return;
      }
    }
    this.showLogin = false; // 不登录直接进入日历
    // 自动恢复主题
    const savedTheme = localStorage.getItem('calendar-theme');
    if (savedTheme) {
      this.setTheme(savedTheme);
    }
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
.remark-panel,
.marked-list {
  background: var(--bg-main);
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
  min-height: 344px;
  align-items: stretch;
  justify-items: center;
}
.calendar-cell {
  color: var(--main-text);
  width: 48px;
  height: 48px;
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
  padding: 0;
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
.remark-panel {
  margin-top: 22px;
  background: var(--remark-panel, #fffbe6);
  border-radius: 10px;
  padding: 14px 18px 12px 18px;
  box-shadow: 0 2px 8px var(--shadow, #e0e6ed33);
}
.marked-list {
  margin-top: 22px;
  background: var(--marked);
  border-radius: 10px;
  padding: 12px 18px 10px 18px;
  box-shadow: 0 2px 8px var(--shadow, #e0e6ed33);
}
.marked-list ul {
  margin: 0;
  padding: 0 0 0 14px;
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
.calendar-dialog-mask {
  position: fixed;
  left: 0; top: 0; right: 0; bottom: 0;
  background: var(--dialog-mask, rgba(0,0,0,0.25));
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.calendar-dialog {
  background: var(--dialog-bg, #fff);
  border-radius: 14px;
  box-shadow: 0 8px 32px var(--dialog-shadow, #bbb);
  padding: 32px 36px 24px 36px;
  min-width: 240px;
  max-width: 90vw;
  text-align: center;
  animation: popIn 0.18s;
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
    min-height: 180px;
    align-items: stretch;
    justify-items: center;
  }
  .calendar-cell {
    width: 36px;
    height: 36px;
    font-size: 13px;
    border-radius: 6px;
    margin: 0;
    padding: 0;
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
  .remark-panel, .marked-list {
    padding: 8px 6px 8px 10px;
    border-radius: 6px;
    margin-top: 12px;
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
