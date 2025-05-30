<template>
  <div class="container">
    <!-- Loading -->
    <div class="loading-init" v-if="loading">
      <div class="loading-init__header">Loading</div>
      <div class="loading-init__status">{{ loadingStatus }}</div>
    </div>
    <!-- Main Stage -->
    <div class="stage-container" ref="stageContainer" v-show="!loading">
      <div class="canvas-container" ref="canvasContainer">
        <canvas id="trails-canvas" ref="trailsCanvas"></canvas>
        <canvas id="main-canvas" ref="mainCanvas"></canvas>
      </div>
      <div class="controls" ref="controls">
        <div class="btn pause-btn" @click="togglePause">
          <svg fill="white" width="24" height="24">
            <use :href="pauseBtnIcon"></use>
          </svg>
        </div>
        <div class="btn sound-btn" @click="toggleSound">
          <svg fill="white" width="24" height="24">
            <use :href="soundBtnIcon"></use>
          </svg>
        </div>
        <div class="btn settings-btn" @click="toggleMenu">
          <svg fill="white" width="24" height="24">
            <use href="#icon-settings"></use>
          </svg>
        </div>
      </div>
      <div class="menu" v-if="menuVisible">
        <div class="menu-content">
          <h3>设置</h3>
          <div class="menu-item">
            <label>烟花数量：</label>
            <input type="range" min="10" max="100" v-model="fireworkCount" />
            <span>{{ fireworkCount }}</span>
          </div>
          <div class="menu-item">
            <label>音效：</label>
            <input type="checkbox" v-model="soundEnabled" />
          </div>
          <button @click="toggleMenu">关闭</button>
        </div>
      </div>
    </div>
    <!-- SVG Spritesheet -->
    <div style="height: 0; width: 0; position: absolute; visibility: hidden;">
      <svg>
        <symbol id="icon-play" viewBox="0 0 24 24">
          <polygon points="5,3 19,12 5,21" />
        </symbol>
        <symbol id="icon-pause" viewBox="0 0 24 24">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </symbol>
        <symbol id="icon-sound-on" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1-3.29-2.5-4.03v8.06c1.5-.74 2.5-2.26 2.5-4.03z" />
        </symbol>
        <symbol id="icon-sound-off" viewBox="0 0 24 24">
          <path d="M16.5 12c0-1.77-1-3.29-2.5-4.03v8.06c1.5-.74 2.5-2.26 2.5-4.03z" />
          <path d="M19 12l2 2m0-4l-2 2" stroke="#fff" stroke-width="2" />
        </symbol>
        <symbol id="icon-settings" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </symbol>
      </svg>
    </div>
  </div>
</template>

<script>
import { onMounted, ref, watch, onUnmounted, nextTick } from 'vue';

export default {
  name: 'FireworksOptimized',
  setup() {
    // refs
    const stageContainer = ref(null);
    const canvasContainer = ref(null);
    const trailsCanvas = ref(null);
    const mainCanvas = ref(null);
    const controls = ref(null);

    // 状态
    const loading = ref(true);
    const loadingStatus = ref('Assembling Shells');
    const menuVisible = ref(false);
    const fireworkCount = ref(50);
    const soundEnabled = ref(false);

    // 图标动态绑定
    const pauseBtnIcon = ref('#icon-play');
    const soundBtnIcon = ref('#icon-sound-off');

    // 动画相关
    let animationId = null;
    const paused = ref(false);
    let ctxMain = null;
    let ctxTrails = null;
    let width = 0;
    let height = 0;

    // 数学常量
    const PI = Math.PI;
    const PI_2 = PI * 2;
    const PI_HALF = PI * 0.5;
    const GRAVITY = 0.9;

    // 运行时变量
    let currentFrame = 0;
    let lastTime = 0;
    const targetSkyColor = { r: 0, g: 0, b: 0 };
    const currentSkyColor = { r: 0, g: 0, b: 0 };
    // 颜色系统
    const COLOR = {
      Red: '#ff0040',
      Green: '#40ff00',
      Blue: '#0040ff',
      Yellow: '#ffff00',
      Orange: '#ff8000',
      Purple: '#ff00ff',
      White: '#ffffff',
      Gold: '#ffd700',
      Silver: '#c0c0c0',
      Pink: '#ff69b4'
    };
    const COLOR_CODES = Object.keys(COLOR); // 使用颜色名称而不是十六进制值
    const COLOR_CODES_W_INVIS = [...COLOR_CODES, 'INVISIBLE'];

    // 颜色转换映射：将十六进制颜色转换为颜色名称
    function hexToColorName(hexColor) {
      if (!hexColor || typeof hexColor !== 'string') {
        return 'Red'; // 默认颜色
      }

      const hex = hexColor.toLowerCase();
      for (const [name, value] of Object.entries(COLOR)) {
        if (value.toLowerCase() === hex) {
          return name;
        }
      }

      // 如果没有完全匹配，选择最相近的颜色
      const colorMap = {
        '#ff0040': 'Red',
        '#40ff00': 'Green',
        '#0040ff': 'Blue',
        '#ffff00': 'Yellow',
        '#ff8000': 'Orange',
        '#ff00ff': 'Purple',
        '#ffffff': 'White',
        '#ffd700': 'Gold',
        '#c0c0c0': 'Silver',
        '#ff69b4': 'Pink'
      };

      return colorMap[hex] || 'Red'; // 默认返回红色
    }
    // 粒子池系统
    function createParticleCollection() {
      const collection = {};
      // 使用颜色名称而不是十六进制值
      Object.keys(COLOR).forEach(colorName => {
        collection[colorName] = [];
      });
      collection['INVISIBLE'] = []; // 添加 INVISIBLE
      return collection;
    }

    // 高级Star粒子系统
    const Star = {
      drawWidth: 3,
      airDrag: 0.98,
      airDragHeavy: 0.992,
      active: createParticleCollection(),
      _pool: [],

      _new() {
        return {};
      },

      add(x, y, color, angle, speed, life, speedOffX = 0, speedOffY = 0) {
        const instance = this._pool.pop() || this._new();

        instance.visible = true;
        instance.heavy = false;
        instance.x = x;
        instance.y = y;
        instance.prevX = x;
        instance.prevY = y;
        instance.color = color;
        instance.speedX = Math.sin(angle) * speed + speedOffX;
        instance.speedY = Math.cos(angle) * speed + speedOffY;
        instance.life = life;
        instance.fullLife = life;
        instance.sparkFreq = 0;
        instance.sparkSpeed = 1;
        instance.sparkTimer = 0;
        instance.sparkColor = color;
        instance.sparkLife = 750;
        instance.sparkLifeVariation = 1.5;
        instance.strobe = false;
        instance.onDeath = null;
        instance.secondColor = null; instance.transitionTime = 0;
        instance.colorChanged = false;

        // 确保颜色键存在
        if (!this.active[color]) {
          console.warn(`Color "${color}" not found in Star.active, using Red instead`);
          color = 'Red';
        }

        this.active[color].push(instance);
        return instance;
      },

      returnInstance(instance) {
        instance.onDeath = null;
        instance.secondColor = null;
        instance.transitionTime = 0;
        instance.colorChanged = false;
        this._pool.push(instance);
      }
    };

    // Spark 系统
    const Spark = {
      drawWidth: 1,
      airDrag: 0.9,
      active: createParticleCollection(),
      _pool: [],

      _new() {
        return {};
      },

      add(x, y, color, angle, speed, life) {
        const instance = this._pool.pop() || this._new();

        instance.x = x;
        instance.y = y;
        instance.prevX = x;
        instance.prevY = y;
        instance.color = color;
        instance.speedX = Math.sin(angle) * speed; instance.speedY = Math.cos(angle) * speed;
        instance.life = life;

        // 确保颜色键存在
        if (!this.active[color]) {
          console.warn(`Color "${color}" not found in Spark.active, using Red instead`);
          color = 'Red';
        }

        this.active[color].push(instance);
        return instance;
      },

      returnInstance(instance) {
        this._pool.push(instance);
      }
    };

    // 爆炸闪光效果
    const BurstFlash = {
      active: [],
      _pool: [],

      _new() {
        return {};
      },

      add(x, y, radius) {
        const instance = this._pool.pop() || this._new();
        instance.x = x;
        instance.y = y;
        instance.radius = radius;
        instance.life = 6;
        this.active.push(instance);
        return instance;
      },

      returnInstance(instance) {
        this._pool.push(instance);
      }
    };

    // 火箭数组
    const rockets = [];
    // 火箭类 - 优化的发射轨迹系统
    class Rocket {
      constructor(startX, startY, targetX, targetY, color) {
        this.startX = startX;
        this.startY = startY;
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.color = color || randomColor();        // 烟花垂直发射轨迹计算
        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 烟花发射速度 - 更快更有力
        this.initialSpeed = Math.max(8, Math.min(Math.abs(dy) / 40, 16));

        // 设置主要为垂直方向的速度，很小的水平偏移
        this.velocityX = dx / Math.abs(dy) * this.initialSpeed * 0.05; // 极小的水平分量
        this.velocityY = dy < 0 ? -this.initialSpeed : this.initialSpeed; // 强劲的垂直分量

        // 轨迹预测 - 预计算整个轨迹路径
        this.predictedPath = this.calculateTrajectory();
        this.flightTime = this.predictedPath.length;
        // 轨迹相关
        this.trail = [];
        this.maxTrailLength = 25;
        this.life = this.flightTime;
        this.exploded = false;
        this.time = 0;        // 增强的视觉效果
        this.radius = 1.5 + Math.random() * 1.0; // 减小光球半径
        this.sparkFreq = 1; // 增加火花频率
        this.sparkTimer = 0;
        this.sparkIntensity = 0.7 + Math.random() * 0.3; // 增加火花强度

        // 轨迹样式
        this.trailColor = this.adjustColorBrightness(this.color, 1.2);
        this.coreColor = this.adjustColorBrightness(this.color, 1.5);

        if (soundEnabled.value) playSound('lift');
      }      // 预计算烟花发射轨迹 - 垂直向上带抖动和变暗效果
      calculateTrajectory() {
        const path = [];
        let x = this.startX;
        let y = this.startY;

        // 烟花垂直发射参数
        const launchSpeed = Math.sqrt((this.targetX - this.startX) ** 2 + (this.targetY - this.startY) ** 2) / 50;
        const targetHeight = this.targetY;
        const totalFrames = Math.abs(targetHeight - this.startY) / launchSpeed;
        // 降低抖动参数 - 更平滑的烟花发射效果
        const shakeIntensity = 1 + Math.random() * 2; // 大幅降低抖动强度
        const shakeFreq = 0.08 + Math.random() * 0.12; // 降低抖动频率
        const windEffect = (Math.random() - 0.5) * 2; // 减小风力影响

        // 随机的抖动模式和不稳定性
        const shakePattern = Math.random() > 0.5 ? 1 : -1;
        const instability = 0.3 + Math.random() * 0.3; // 提高发射稳定性

        // 轨迹亮度变化参数
        const brightnessPhaseCount = 2 + Math.floor(Math.random() * 3); // 2-4个亮度变化阶段
        const brightnessPhases = [];

        // 生成亮度变化阶段
        for (let i = 0; i < brightnessPhaseCount; i++) {
          brightnessPhases.push({
            startFrame: Math.floor((totalFrames / brightnessPhaseCount) * i),
            endFrame: Math.floor((totalFrames / brightnessPhaseCount) * (i + 1)),
            // 每个阶段有不同的最大亮度
            maxBrightness: i === 0 || i === brightnessPhaseCount - 1
              ? 1.0  // 第一阶段和最后阶段最亮
              : 0.3 + Math.random() * 0.4 // 中间阶段较暗
          });
        }

        // 随机的轨迹可见性区间 - 有些部分可能完全不可见
        const invisibleSegments = [];
        if (Math.random() < 0.7) { // 70%的概率有不可见段
          const segmentCount = 1 + Math.floor(Math.random() * 2); // 1-2个不可见段

          for (let i = 0; i < segmentCount; i++) {
            // 不在开始和结束位置创建不可见段
            const segmentStart = Math.floor(totalFrames * 0.2) +
              Math.floor(Math.random() * totalFrames * 0.6);
            const segmentLength = Math.floor(totalFrames * 0.05) +
              Math.floor(Math.random() * totalFrames * 0.15);

            invisibleSegments.push({
              start: segmentStart,
              end: segmentStart + segmentLength
            });
          }
        }

        // 轨迹亮度曲线
        const getBrightnessAtFrame = (frame) => {
          // 检查是否在不可见段内
          for (const segment of invisibleSegments) {
            if (frame >= segment.start && frame <= segment.end) {
              return 0; // 不可见
            }
          }

          // 找到当前亮度阶段
          for (const phase of brightnessPhases) {
            if (frame >= phase.startFrame && frame <= phase.endFrame) {
              const phaseProgress = (frame - phase.startFrame) /
                (phase.endFrame - phase.startFrame);

              // 在阶段开始和结束处渐变，中间部分保持最大亮度
              if (phaseProgress < 0.2) {
                // 渐亮
                return phaseProgress * 5 * phase.maxBrightness;
              } else if (phaseProgress > 0.8) {
                // 渐暗
                return (1 - (phaseProgress - 0.8) * 5) * phase.maxBrightness;
              } else {
                // 保持最大亮度
                return phase.maxBrightness;
              }
            }
          }

          return 1.0; // 默认亮度
        };

        for (let t = 0; t < totalFrames && t < 100; t++) {
          // 垂直上升
          const progress = t / totalFrames;
          y = this.startY + (this.targetY - this.startY) * progress;
          // 主要抖动效果 - 更加平滑
          const mainShake = Math.sin(t * shakeFreq) * shakeIntensity * instability * (1 - progress * 0.8);

          // 高频微抖动 - 降低幅度
          const microShake = Math.sin(t * shakeFreq * 3 + Math.random()) * shakeIntensity * 0.2;

          // 低频摆动 - 减小幅度
          const swayShake = Math.sin(t * shakeFreq * 0.2) * shakeIntensity * 0.5 * progress;

          // 风力偏移（更平滑）
          const windOffset = windEffect * progress * progress * 0.8;
          // 组合所有效果
          x = this.startX +
            (mainShake * shakePattern) +
            microShake +
            swayShake +
            windOffset;
          // 添加随机扰动（前期较强，后期减弱）
          x += (Math.random() - 0.5) * shakeIntensity * 0.4 * (1 - progress * 0.9);

          // 计算当前帧的亮度
          const brightness = getBrightnessAtFrame(t);

          path.push({
            x,
            y,
            brightness // 存储亮度信息
          });

          // 检查是否接近目标高度
          if (Math.abs(y - this.targetY) < 12) break;
        }

        return path;
      }
      // 颜色亮度调整
      adjustColorBrightness(color, factor) {
        // 如果是颜色名称，先转换为十六进制
        const hexColor = COLOR[color] || color;

        // 简单的颜色亮度调整
        const rgb = this.hexToRgb(hexColor);
        if (!rgb) return hexColor;

        const r = Math.min(255, Math.floor(rgb.r * factor));
        const g = Math.min(255, Math.floor(rgb.g * factor));
        const b = Math.min(255, Math.floor(rgb.b * factor));

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }

      // 十六进制转RGB
      hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      }
      update() {
        if (this.exploded) return;

        this.time++;

        // 使用预计算的垂直轨迹路径
        if (this.time < this.predictedPath.length) {
          const currentFrame = Math.floor(this.time);
          const nextFrame = Math.min(currentFrame + 1, this.predictedPath.length - 1);
          const progress = this.time - currentFrame;

          // 保存前一位置
          const prevX = this.x;
          const prevY = this.y;

          // 平滑插值位置
          const current = this.predictedPath[currentFrame];
          const next = this.predictedPath[nextFrame];

          this.x = current.x + (next.x - current.x) * progress;
          this.y = current.y + (next.y - current.y) * progress;

          // 计算当前帧的速度（用于视觉效果）
          this.velocityX = this.x - prevX;
          this.velocityY = this.y - prevY;

          // 获取当前帧的预计算亮度信息
          const currentBrightness = current.brightness || 0;
          const nextBrightness = next.brightness || 0;
          const interpolatedBrightness = currentBrightness + (nextBrightness - currentBrightness) * progress;

          // 只有当亮度足够时才生成轨迹点
          if (interpolatedBrightness > 0.1 && Math.random() > 0.1) {
            const flightProgress = this.time / this.flightTime;
            const brightnessVariation = Math.random() * 0.2; // 轻微的随机亮度变化

            // 使用预计算的亮度信息
            const alphaMultiplier = interpolatedBrightness * (0.7 + brightnessVariation);

            // 轨迹点
            this.trail.push({
              x: this.x,
              y: this.y,
              life: Math.floor(10 + Math.random() * 15 * interpolatedBrightness), // 亮度影响生命周期
              alpha: Math.max(0.1, Math.min(1, alphaMultiplier)),
              size: this.radius * (0.7 + Math.random() * 0.4) * interpolatedBrightness,
              speed: Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY)
            });
          }

          // 控制轨迹长度
          // 根据飞行阶段调整最大轨迹长度
          const flightProgressForLength = this.time / this.flightTime;
          if (flightProgressForLength < 0.3) {
            // 起始阶段 - 较短轨迹
            this.maxTrailLength = 10 + Math.floor(Math.random() * 5);
          } else if (flightProgressForLength < 0.7) {
            // 中间阶段 - 中等轨迹
            this.maxTrailLength = 15 + Math.floor(Math.random() * 5);
          } else {
            // 末尾阶段 - 较长轨迹，为爆炸做准备
            this.maxTrailLength = 20 + Math.floor(Math.random() * 10);
          }

          if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
          }

          // 更新轨迹点的生命周期和alpha - 增加衰减速率的变化
          for (let i = this.trail.length - 1; i >= 0; i--) {
            const point = this.trail[i];
            point.life -= 1 + Math.random() * 0.5; // 不均匀的衰减

            // 非线性的alpha衰减
            const lifeRatio = point.life / 20;
            const positionFactor = i / this.trail.length;

            // 增加随机闪烁
            const flicker = Math.random() > 0.93 ? 0.7 : 1; // 偶尔闪烁

            point.alpha = (lifeRatio * positionFactor) * point.alpha * flicker;
            point.size *= 0.95 + Math.random() * 0.05; // 轨迹点逐渐缩小，速率有波动

            if (point.life <= 0 || point.alpha < 0.05) {
              this.trail.splice(i, 1);
            }
          }
        }

        // 增强的火花生成系统 - 适配垂直发射
        this.sparkTimer++;
        if (this.sparkTimer >= this.sparkFreq) {
          this.sparkTimer = 0;
          const intensity = this.sparkIntensity * (this.life / this.flightTime);

          // 根据垂直速度生成更多火花
          const speed = Math.abs(this.velocityY); // 主要关注垂直速度
          const sparkCount = Math.floor(2 + speed * 0.5); // 增加火花数量

          for (let i = 0; i < sparkCount; i++) {
            // 火花主要向下和侧面散射（模拟推进器效果）
            const sparkAngle = Math.random() * Math.PI * 1.2 + Math.PI * 0.4; // 下半圆偏向
            Spark.add(
              this.x + (Math.random() - 0.5) * 6,
              this.y + (Math.random() - 0.5) * 6,
              Math.random() < 0.7 ? hexToColorName(this.color) : hexToColorName(this.trailColor),
              sparkAngle,
              Math.random() * 3 + 1,
              80 + Math.random() * 120
            );
          }
        }

        // 优化的到达检测
        const distanceToTarget = Math.sqrt((this.targetX - this.x) ** 2 + (this.targetY - this.y) ** 2);
        this.life--;

        // 更精确的爆炸条件
        if (distanceToTarget < 25 || this.life <= 0 || this.time >= this.predictedPath.length - 1) {
          this.explode();
        }
      }
      explode() {
        if (this.exploded) return;
        this.exploded = true;

        // 基于轨迹数据计算爆炸强度
        const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        const trajectoryIntensity = Math.min(speed / 10, 1.5); // 速度越快爆炸越强
        const heightFactor = (800 - this.y) / 800; // 高度因子，越高爆炸效果越好

        // 根据轨迹质量调整爆炸参数
        const trailQuality = this.trail.length / this.maxTrailLength;
        const explosionIntensity = (trajectoryIntensity + heightFactor + trailQuality) / 3;
        // 创建专业级烟花爆炸，基于轨迹数据
        // 确保颜色是名称格式，而不是十六进制
        const colorName = typeof this.color === 'string' && this.color.startsWith('#') ?
          hexToColorName(this.color) : this.color;
        // 根据爆炸强度和随机性选择烟花类型
        const effectType = Math.random();

        // 高度较高的位置有更多机会产生特效烟花
        const specialEffectChance = 0.4 + heightFactor * 0.3;

        if (effectType < specialEffectChance) {
          // 特殊效果烟花类型
          const specialTypes = [
            // 20% 概率 - 心形烟花
            {
              type: 'heart',
              chance: 0.2,
              options: {
                shellSize: 0.5 + explosionIntensity * 0.5,
                color: colorName,
                starCount: Math.floor(fireworkCount.value * 1.2),
                glitter: Math.random() < 0.4 ? 'medium' : null,
                specialShape: 'heart'
              }
            },
            // 20% 概率 - 星形烟花
            {
              type: 'star',
              chance: 0.2,
              options: {
                shellSize: 0.6 + explosionIntensity * 0.4,
                color: Math.random() < 0.5 ? [colorName, randomColor()] : colorName,
                starCount: Math.floor(fireworkCount.value * 1.0),
                points: 5 + Math.floor(Math.random() * 3),
                specialShape: 'star'
              }
            },
            // 15% 概率 - 螺旋效果
            {
              type: 'spiral',
              chance: 0.15,
              options: {
                shellSize: 0.5 + explosionIntensity * 0.5,
                color: Math.random() < 0.3 ? [colorName, hexToColorName(this.trailColor)] : colorName,
                starCount: Math.floor(fireworkCount.value * 0.8),
                turns: 2 + Math.random() * 3,
                specialShape: 'spiral'
              }
            },
            // 15% 概率 - 字母烟花
            {
              type: 'letter',
              chance: 0.15,
              options: {
                shellSize: 0.7 + explosionIntensity * 0.3,
                color: Math.random() < 0.5 ? [colorName, 'White', 'Gold'] : colorName,
                letter: ['A', 'V', 'O'][Math.floor(Math.random() * 3)],
                starCount: Math.floor(fireworkCount.value * 1.0),
                specialShape: 'letter'
              }
            },
            // 30% 概率 - 环形爆炸
            {
              type: 'ring',
              chance: 0.3,
              options: {
                shellSize: 0.6 + explosionIntensity * 0.4,
                color: Math.random() < 0.6 ? [colorName, hexToColorName(this.trailColor), 'White'] : colorName,
                starCount: Math.floor(fireworkCount.value * 0.9),
                ring: true
              }
            }
          ];

          // 根据概率权重选择特效类型
          let selectedEffectType;
          let chanceSum = 0;
          const rand = Math.random();

          for (const type of specialTypes) {
            chanceSum += type.chance;
            if (rand < chanceSum) {
              selectedEffectType = type;
              break;
            }
          }

          // 如果选择了特效，应用它
          if (selectedEffectType) {
            const options = {
              ...selectedEffectType.options,
              glitter: selectedEffectType.options.glitter ||
                (Math.random() < (0.2 + explosionIntensity * 0.2) ?
                  ['light', 'medium', 'heavy'][Math.floor(Math.random() * 3)] : null),
              pistil: Math.random() < (0.15 + explosionIntensity * 0.15),
              velocity: speed * 0.1,
              direction: Math.atan2(this.velocityY, this.velocityX)
            };

            createAdvancedFirework(this.x, this.y, options);
          } else {
            // 默认爆炸效果（备用）
            createAdvancedFirework(this.x, this.y, {
              shellSize: 0.5 + explosionIntensity * 0.6,
              color: Math.random() < 0.3 ? [colorName, hexToColorName(this.trailColor), randomColor()] : colorName,
              glitter: Math.random() < (0.3 + explosionIntensity * 0.3) ?
                ['light', 'medium', 'heavy'][Math.floor(Math.random() * 3)] : null,
              pistil: Math.random() < (0.2 + explosionIntensity * 0.2),
              ring: Math.random() < (0.1 + explosionIntensity * 0.15),
              starCount: Math.floor(fireworkCount.value + explosionIntensity * 40 + Math.random() * 20),
              velocity: speed * 0.1,
              direction: Math.atan2(this.velocityY, this.velocityX)
            });
          }
        } else {
          // 传统爆炸效果
          createAdvancedFirework(this.x, this.y, {
            shellSize: 0.5 + explosionIntensity * 0.6,
            color: Math.random() < 0.3 ? [colorName, hexToColorName(this.trailColor), randomColor()] : colorName,
            glitter: Math.random() < (0.3 + explosionIntensity * 0.3) ?
              ['light', 'medium', 'heavy'][Math.floor(Math.random() * 3)] : null,
            pistil: Math.random() < (0.2 + explosionIntensity * 0.2),
            ring: Math.random() < (0.1 + explosionIntensity * 0.15),
            starCount: Math.floor(fireworkCount.value + explosionIntensity * 40 + Math.random() * 20),
            velocity: speed * 0.1,
            direction: Math.atan2(this.velocityY, this.velocityX)
          });
        }

        // 添加轨迹爆炸效果 - 沿着轨迹路径创建小爆炸
        if (this.trail.length > 5) { // 只要轨迹足够长就触发
          const trailExplosions = Math.max(1, Math.min(3, Math.floor(explosionIntensity * 2)));
          for (let i = 0; i < trailExplosions; i++) {
            const trailIndex = Math.floor(Math.random() * Math.max(1, this.trail.length - 5));
            const trailPoint = this.trail[trailIndex];
            if (trailPoint) {
              setTimeout(() => {
                createAdvancedFirework(trailPoint.x, trailPoint.y, {
                  shellSize: 0.2 + Math.random() * 0.3,
                  color: hexToColorName(this.trailColor),
                  starCount: 8 + Math.floor(Math.random() * 12),
                  glitter: null,
                  pistil: false,
                  ring: false
                });
              }, i * 100 + Math.random() * 200);
            }
          }
        }
      } draw(ctx) {
        if (this.exploded) return;

        ctx.save();
        // 获取十六进制颜色值用于渐变
        const rocketColorHex = COLOR[this.color] || this.color;
        const trailColorHex = this.trailColor; // trailColor 现在已经是十六进制格式

        // 绘制增强的轨迹系统
        if (this.trail.length > 1) {
          // 弱化全局轨迹渐变，让局部渐变更明显
          const trailGradient = ctx.createLinearGradient(
            this.trail[0].x, this.trail[0].y,
            this.trail[this.trail.length - 1].x, this.trail[this.trail.length - 1].y
          );
          trailGradient.addColorStop(0, trailColorHex + '00'); // 完全透明
          trailGradient.addColorStop(0.3, trailColorHex + '33'); // 更透明
          trailGradient.addColorStop(1, trailColorHex + 'BB'); // 降低最大不透明度
          // 轨迹阴影效果 - 更柔和的轨迹光晕
          ctx.strokeStyle = trailColorHex + '22'; // 降低透明度
          ctx.lineWidth = this.radius * 2.0; // 稍微减小轨迹宽度
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalCompositeOperation = 'lighter';

          // 仅绘制透明度足够的轨迹点
          if (this.trail.filter(p => p.alpha > 0.1).length > 1) {
            ctx.beginPath();
            let started = false;

            // 有选择地绘制轨迹，跳过透明度太低的点，创造间断效果
            for (let i = 0; i < this.trail.length; i++) {
              if (this.trail[i].alpha > 0.1) {
                if (!started) {
                  ctx.moveTo(this.trail[i].x, this.trail[i].y);
                  started = true;
                } else {
                  ctx.lineTo(this.trail[i].x, this.trail[i].y);
                }
              } else if (started) {
                // 当遇到透明度低的点，结束当前路径并开始新路径
                ctx.stroke();
                ctx.beginPath();
                started = false;
              }
            }
            if (started) ctx.stroke();
          }

          // 绘制主轨迹线 - 点到点绘制，考虑每个点的单独alpha值
          ctx.globalCompositeOperation = 'source-over';
          let prevPointDrawn = null;

          for (let i = 1; i < this.trail.length; i++) {
            const point = this.trail[i];
            const prevPoint = this.trail[i - 1];

            // 考虑点自身的alpha和位置因子的组合
            const alphaBase = point.alpha * 0.9;

            if (alphaBase > 0.08) { // 只绘制足够亮的部分
              // 创建点到点的渐变
              const segmentGradient = ctx.createLinearGradient(
                prevPoint.x, prevPoint.y, point.x, point.y
              );

              // 使用两个点各自的alpha制造更自然的过渡
              const prevAlpha = Math.min(255, Math.floor(prevPoint.alpha * 255));
              const currAlpha = Math.min(255, Math.floor(alphaBase * 255));

              const prevAlphaHex = prevAlpha.toString(16).padStart(2, '0');
              const currAlphaHex = currAlpha.toString(16).padStart(2, '0');

              segmentGradient.addColorStop(0, trailColorHex + prevAlphaHex);
              segmentGradient.addColorStop(1, rocketColorHex + currAlphaHex);

              ctx.strokeStyle = segmentGradient;
              ctx.lineWidth = point.size * alphaBase; // 线宽随alpha变化
              ctx.globalAlpha = Math.max(0.1, (prevPoint.alpha + point.alpha) / 2);

              ctx.beginPath();
              ctx.moveTo(prevPoint.x, prevPoint.y);
              ctx.lineTo(point.x, point.y);
              ctx.stroke();
            }
          }
        }

        // 绘制增强的火箭本体
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'lighter';

        // 获取十六进制颜色值用于渐变
        const colorHex = rocketColorHex;
        // 外层光晕 - 减小光晕大小
        const outerGlow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2.5);
        outerGlow.addColorStop(0, colorHex + 'AA');
        outerGlow.addColorStop(0.4, colorHex + '66');
        outerGlow.addColorStop(0.7, colorHex + '22');
        outerGlow.addColorStop(1, colorHex + '00');
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2.5, 0, PI_2);
        ctx.fill();
        // 中层火焰效果
        const flameGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 1.5);
        flameGradient.addColorStop(0, colorHex + 'FF');
        flameGradient.addColorStop(0.5, colorHex + 'CC');
        flameGradient.addColorStop(1, colorHex + '44');
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.5, 0, PI_2);
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
        // 主体核心
        const coreGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 1.2);
        coreGradient.addColorStop(0, this.coreColor || '#FFFFFF');
        coreGradient.addColorStop(0.3, colorHex + 'EE');
        coreGradient.addColorStop(1, colorHex + '88');

        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.2, 0, PI_2);
        ctx.fill();
        // 高亮核心点
        ctx.fillStyle = this.coreColor || '#FFFFFF';
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.6, 0, PI_2);
        ctx.fill();

        // 添加脉冲效果
        const pulseIntensity = Math.sin(this.time * 0.3) * 0.3 + 0.7;
        ctx.globalAlpha = pulseIntensity * 0.6;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.3 * pulseIntensity, 0, PI_2);
        ctx.fill();

        // 绘制方向指示器（显示火箭运动方向）
        if (this.velocityX !== 0 || this.velocityY !== 0) {
          const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
          if (speed > 0.5) {
            const angle = Math.atan2(this.velocityY, this.velocityX);
            const arrowLength = this.radius * 1.5;
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = rocketColorHex + 'BB';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';

            // 绘制方向箭头
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
              this.x + Math.cos(angle) * arrowLength,
              this.y + Math.sin(angle) * arrowLength
            );
            ctx.stroke();

            // 箭头尖端
            const arrowHeadLength = arrowLength * 0.3;
            const arrowHeadAngle = 0.5;

            ctx.beginPath();
            ctx.moveTo(
              this.x + Math.cos(angle) * arrowLength,
              this.y + Math.sin(angle) * arrowLength
            );
            ctx.lineTo(
              this.x + Math.cos(angle - arrowHeadAngle) * (arrowLength - arrowHeadLength),
              this.y + Math.sin(angle - arrowHeadAngle) * (arrowLength - arrowHeadLength)
            );
            ctx.moveTo(
              this.x + Math.cos(angle) * arrowLength,
              this.y + Math.sin(angle) * arrowLength
            );
            ctx.lineTo(
              this.x + Math.cos(angle + arrowHeadAngle) * (arrowLength - arrowHeadLength),
              this.y + Math.sin(angle + arrowHeadAngle) * (arrowLength - arrowHeadLength)
            );
            ctx.stroke();
          }
        }

        // 绘制预测轨迹（淡淡的虚线，显示火箭将要飞行的路径）
        if (this.showPrediction && this.predictedPath.length > this.time + 10) {
          ctx.globalAlpha = 0.3;
          ctx.strokeStyle = rocketColorHex + '66';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 10]);

          ctx.beginPath();
          const startIndex = Math.max(0, this.time);
          const endIndex = Math.min(this.predictedPath.length - 1, this.time + 30);

          if (startIndex < this.predictedPath.length) {
            ctx.moveTo(this.predictedPath[startIndex].x, this.predictedPath[startIndex].y);
            for (let i = startIndex + 1; i <= endIndex; i++) {
              ctx.lineTo(this.predictedPath[i].x, this.predictedPath[i].y);
            }
            ctx.stroke();
          }

          ctx.setLineDash([]); // 重置虚线样式
        }

        ctx.restore();
      }
    }

    // 粒子弧形分布生成器
    function createParticleArc(start, arcLength, count, randomness, particleFactory) {
      const angleDelta = arcLength / count;
      const end = start + arcLength - (angleDelta * 0.5);

      if (end > start) {
        for (let angle = start; angle < end; angle = angle + angleDelta) {
          particleFactory(angle + Math.random() * angleDelta * randomness);
        }
      } else {
        for (let angle = start; angle > end; angle = angle + angleDelta) {
          particleFactory(angle + Math.random() * angleDelta * randomness);
        }
      }
    }

    // 球形粒子爆炸生成器
    function createBurst(count, particleFactory, startAngle = 0, arcLength = PI_2) {
      const R = 0.5 * Math.sqrt(count / Math.PI);
      const C = 2 * R * Math.PI;
      const C_HALF = C / 2;

      for (let i = 0; i <= C_HALF; i++) {
        const ringAngle = i / C_HALF * PI_HALF;
        const ringSize = Math.cos(ringAngle);
        const partsPerFullRing = C * ringSize;
        const partsPerArc = partsPerFullRing * (arcLength / PI_2);

        const angleInc = PI_2 / partsPerFullRing;
        const angleOffset = Math.random() * angleInc + startAngle;
        const maxRandomAngleOffset = angleInc * 0.33;

        for (let j = 0; j < partsPerArc; j++) {
          const randomAngleOffset = Math.random() * maxRandomAngleOffset;
          let angle = angleInc * j + angleOffset + randomAngleOffset;
          particleFactory(angle, ringSize);
        }
      }
    }

    // 螺旋状粒子生成器
    function createSpiral(count, turns, particleFactory) {
      const angleStep = turns * PI_2 / count;
      const radiusStep = 0.8 / count;

      for (let i = 0; i < count; i++) {
        const angle = i * angleStep;
        const radiusMult = 0.2 + i * radiusStep;
        particleFactory(angle, radiusMult);
      }
    }

    // 心形粒子生成器
    function createHeart(count, particleFactory, scale = 1, xOffset = 0, yOffset = 0, direction = 0) {
      const angleStep = PI_2 / count;
      for (let i = 0; i < count; i++) {
        let angle = i * angleStep;
        // 应用方向旋转，并让心形竖直朝上
        angle += direction;
        const t = angle - Math.PI / 2;
        let x = 16 * Math.pow(Math.sin(t), 3);
        let y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        x = x * scale * 0.05 + xOffset;
        y = -y * scale * 0.05 + yOffset;
        const directionAngle = Math.atan2(y, x);
        const speed = Math.sqrt(x * x + y * y);
        particleFactory(directionAngle, speed);
      }
    }

    // 星形粒子生成器
    function createStar(count, points, particleFactory, scale = 1, rotation = 0) {
      const angleStep = PI_2 / (points * 2);

      for (let i = 0; i < points * 2; i++) {
        const angle = i * angleStep + rotation;
        // 内外圆半径比
        const radius = (i % 2 === 0) ? 1 : 0.4;

        const x = Math.cos(angle) * radius * scale;
        const y = Math.sin(angle) * radius * scale;
        const directionAngle = angle;

        if (i % 2 === 0 || Math.random() < 0.8) { // 只在主角上放置粒子
          particleFactory(directionAngle, radius * scale);
        }
      }
    }

    // 字母效果生成器 - 支持 "A"、"V"、"W"、"M"、"O" 形状
    function createLetter(letter, count, particleFactory, scale = 1) {
      const angleStep = PI_2 / count;

      if (letter === 'A') {
        // A 形状
        for (let i = 0; i < count; i++) {
          const progress = i / count;
          let x, y;

          if (progress < 0.4) {
            // 左腿
            x = -0.5 + progress * 1.25;
            y = -1 + progress * 2.5;
          } else if (progress < 0.6) {
            // 横杆
            x = -0.25 + (progress - 0.4) * 2.5;
            y = 0;
          } else {
            // 右腿
            x = 0.5 - (progress - 0.6) * 1.25;
            y = -1 + (progress - 0.6) * 2.5;
          }

          // 放大并计算角度
          x *= scale;
          y *= scale;
          const angle = Math.atan2(y, x);
          const speed = Math.sqrt(x * x + y * y);

          particleFactory(angle, speed);
        }
      } else if (letter === 'V') {
        // V 形状
        for (let i = 0; i < count; i++) {
          const progress = i / count;
          let x, y;

          if (progress < 0.5) {
            // 左边
            x = -0.5 + progress;
            y = -1 + progress * 2;
          } else {
            // 右边
            x = 0.5 - (progress - 0.5);
            y = 1 - (progress - 0.5) * 2;
          }

          x *= scale;
          y *= scale;
          const angle = Math.atan2(y, x);
          const speed = Math.sqrt(x * x + y * y);

          particleFactory(angle, speed);
        }
      } else if (letter === 'O') {
        // O 形状（圆形）
        for (let i = 0; i < count; i++) {
          const angle = i * angleStep;
          const x = Math.cos(angle) * scale * 0.5;
          const y = Math.sin(angle) * scale * 0.5;
          const directionAngle = angle;

          particleFactory(directionAngle, scale * 0.5);
        }
      } else {
        // 默认圆形
        for (let i = 0; i < count; i++) {
          const angle = i * angleStep;
          particleFactory(angle, scale);
        }
      }
    }

    // 柳树型粒子生成器 - Willow
    function createWillow(count, particleFactory, scale = 1) {
      const segments = 8; // 柳条数量
      const particlesPerSegment = Math.floor(count / segments);
      
      for (let segment = 0; segment < segments; segment++) {
        const baseAngle = (segment / segments) * PI_2;
        
        for (let i = 0; i < particlesPerSegment; i++) {
          const progress = i / particlesPerSegment;
          // 柳条下垂效果：初始向外，然后向下弯曲
          const angle = baseAngle + (Math.random() - 0.5) * 0.3;
          const speedMult = 0.8 + progress * 0.6; // 越往后速度越快
          
          const star = particleFactory(angle, speedMult * scale);
          if (star) {
            // 柳树特效：重力增强，下垂效果
            star.heavy = true;
            star.gravityMult = 1.5 + progress; // 渐增重力
            star.dragMult = 0.92; // 更强的空气阻力
          }
        }
      }
    }
    
    // 菊花型粒子生成器 - Chrysanthemum
    function createChrysanthemum(count, particleFactory, scale = 1) {
      const petals = 12; // 花瓣数量
      const particlesPerPetal = Math.floor(count / petals);
      
      for (let petal = 0; petal < petals; petal++) {
        const petalAngle = (petal / petals) * PI_2;
        
        for (let i = 0; i < particlesPerPetal; i++) {
          const progress = i / particlesPerPetal;
          // 菊花花瓣效果：紧密排列，轻微扩散
          const angle = petalAngle + (Math.random() - 0.5) * 0.15;
          const speedMult = 0.6 + progress * 0.8;
          
          particleFactory(angle, speedMult * scale);
        }
      }
    }
    
    // 棕榈型粒子生成器 - Palm
    function createPalm(count, particleFactory, scale = 1) {
      const fronds = 6; // 棕榈叶数量
      const particlesPerFrond = Math.floor(count / fronds);
      
      for (let frond = 0; frond < fronds; frond++) {
        const frondAngle = (frond / fronds) * PI_2;
        
        for (let i = 0; i < particlesPerFrond; i++) {
          const progress = i / particlesPerFrond;
          // 棕榈叶弧形轨迹
          const angle = frondAngle + Math.sin(progress * PI) * 0.4;
          const speedMult = 0.7 + progress * 0.6;
          
          const star = particleFactory(angle, speedMult * scale);
          if (star) {
            // 棕榈特效：弧形轨迹
            star.arcEffect = true;
            star.arcStrength = 0.02 * (1 + Math.random());
          }
        }
      }
    }
    
    // 马尾型粒子生成器 - Horse Tail
    function createHorseTail(count, particleFactory, scale = 1, direction = 0) {
      const trails = 3; // 马尾条数
      const particlesPerTrail = Math.floor(count / trails);
      
      for (let trail = 0; trail < trails; trail++) {
        const trailOffset = (trail - 1) * 0.3; // 三条尾巴的角度偏移
        
        for (let i = 0; i < particlesPerTrail; i++) {
          const progress = i / particlesPerTrail;
          const angle = direction + trailOffset + (Math.random() - 0.5) * 0.2;
          const speedMult = 0.4 + progress * 1.2; // 长拖尾效果
          
          const star = particleFactory(angle, speedMult * scale);
          if (star) {
            // 马尾特效：长生命周期，强拖尾
            star.life *= 1.8;
            star.trailLength = 2.5;
            star.fadeRate = 0.98;
          }
        }
      }
    }
    
    // 秃头型粒子生成器 - Kamuro
    function createKamuro(count, particleFactory, scale = 1) {
      // 紧密的球形爆炸，粒子寿命短
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * PI_2;
        const speedMult = 0.3 + Math.random() * 0.4; // 较慢的速度
        
        const star = particleFactory(angle, speedMult * scale);
        if (star) {
          // 秃头特效：短寿命，快速消失
          star.life *= 0.4;
          star.fadeRate = 0.92;
          star.brightCore = true; // 明亮的核心
        }
      }
    }

    // 星星死亡效果
    function crossetteEffect(star) {
      const startAngle = Math.random() * PI_HALF;
      createParticleArc(startAngle, PI_2, 4, 0.5, (angle) => {
        Star.add(
          star.x, star.y, star.color, angle,
          Math.random() * 0.6 + 0.75, 600
        );
      });
    }

    function floralEffect(star) {
      const count = 15;
      createBurst(count, (angle, speedMult) => {
        Star.add(
          star.x, star.y, star.color, angle,
          speedMult * 2.4, 1000 + Math.random() * 300,
          star.speedX, star.speedY
        );
      });
      BurstFlash.add(star.x, star.y, 46);
      if (soundEnabled.value) playSound('burst');
    }

    // 新增: 螺旋死亡效果
    function spiralEffect(star) {
      const count = 20;
      const turns = 2 + Math.random() * 3;
      createSpiral(count, turns, (angle, speedMult) => {
        Star.add(
          star.x, star.y, star.color, angle,
          speedMult * 3.0, 800 + Math.random() * 400,
          star.speedX * 0.1, star.speedY * 0.1
        );
      });
      BurstFlash.add(star.x, star.y, 30);
      if (soundEnabled.value) playSound('burst');
    }

    // 新增: 心形死亡效果
    function heartEffect(star) {
      const count = 40;
      createHeart(count, (angle, speedMult) => {
        Star.add(
          star.x, star.y, star.color, angle,
          speedMult * 2.0, 1200 + Math.random() * 300
        );
      });
      BurstFlash.add(star.x, star.y, 40);
      if (soundEnabled.value) playSound('burst');
    }

    // 新增: 星形死亡效果
    function starEffect(star) {
      const points = 5 + Math.floor(Math.random() * 3); // 5-7点星
      const count = points * 2;
      const rotation = Math.random() * PI_2;
      createStar(count, points, (angle, speedMult) => {
        Star.add(
          star.x, star.y, star.color, angle,
          speedMult * 2.5, 1000 + Math.random() * 300
        );
      }, 1.2, rotation);
      BurstFlash.add(star.x, star.y, 35);
      if (soundEnabled.value) playSound('burst');
    }
    // 创建高级烟花爆炸
    function createAdvancedFirework(x, y, options = {}) {
      const {
        shellSize = 1,
        color = randomColor(),
        glitter = null,
        pistil = false,
        ring = false,
        specialShape = null, // 添加特殊形状参数
        letter = null,       // 字母形状
        points = 5,          // 星形点数
        turns = 2,           // 螺旋圈数
        starCount = fireworkCount.value
      } = options;

      const spreadSize = shellSize * 200;
      const starLife = shellSize * 900;
      const speed = spreadSize / 96;

      let sparkFreq, sparkSpeed, sparkLife, sparkLifeVariation;

      // 设置闪烁参数
      if (glitter === 'light') {
        sparkFreq = 400; sparkSpeed = 0.3; sparkLife = 300; sparkLifeVariation = 2;
      } else if (glitter === 'medium') {
        sparkFreq = 200; sparkSpeed = 0.44; sparkLife = 700; sparkLifeVariation = 2;
      } else if (glitter === 'heavy') {
        sparkFreq = 80; sparkSpeed = 0.8; sparkLife = 1400; sparkLifeVariation = 2;
      }
      const starFactory = (angle, speedMult = 1) => {
        const star = Star.add(
          x, y, Array.isArray(color) ? color[Math.floor(Math.random() * color.length)] : color,
          angle, speedMult * speed,
          starLife + Math.random() * starLife * 0.2
        );
        if (glitter) {
          star.sparkFreq = sparkFreq;
          star.sparkSpeed = sparkSpeed;
          star.sparkLife = sparkLife;
          star.sparkLifeVariation = sparkLifeVariation;
          star.sparkColor = 'Gold';
          star.sparkTimer = Math.random() * star.sparkFreq;
        }

        // 随机死亡效果 - 更多变化
        const effectChance = Math.random();
        if (effectChance < 0.1) {
          star.onDeath = crossetteEffect;
        } else if (effectChance < 0.15) {
          star.onDeath = floralEffect;
        } else if (effectChance < 0.2) {
          star.onDeath = spiralEffect; // 新增螺旋效果
        } else if (effectChance < 0.225) {
          star.onDeath = heartEffect;  // 新增心形效果
        } else if (effectChance < 0.25) {
          star.onDeath = starEffect;   // 新增星形效果
        }
      };

      // 环形烟花
      if (ring) {
        const ringStartAngle = Math.random() * Math.PI;
        const ringSquash = Math.pow(Math.random(), 2) * 0.85 + 0.15;

        createParticleArc(0, PI_2, starCount, 0, angle => {
          const initSpeedX = Math.sin(angle) * speed * ringSquash;
          const initSpeedY = Math.cos(angle) * speed;
          const newSpeed = Math.sqrt(initSpeedX * initSpeedX + initSpeedY * initSpeedY);
          const newAngle = Math.atan2(initSpeedY, initSpeedX) + ringStartAngle;

          const star = Star.add(x, y, Array.isArray(color) ? color[Math.floor(Math.random() * color.length)] : color, newAngle, newSpeed, starLife);
          if (glitter) {
            star.sparkFreq = sparkFreq;
            star.sparkSpeed = sparkSpeed;
            star.sparkLife = sparkLife;
            star.sparkLifeVariation = sparkLifeVariation;
            star.sparkColor = 'Gold';
            star.sparkTimer = Math.random() * star.sparkFreq;
          }
        });
      }      // 双色烟花
      else if (Array.isArray(color)) {
        if (Math.random() < 0.5) {
          const start = Math.random() * Math.PI;
          const start2 = start + Math.PI;
          const arc = Math.PI;
          createBurst(starCount, (angle, speedMult) => {
            starFactory(angle + start, speedMult);
          }, start, arc);
          createBurst(starCount, (angle, speedMult) => {
            starFactory(angle + start2, speedMult);
          }, start2, arc);
        } else {
          // 随机选择更复杂的双色效果
          const effectType = Math.random();

          if (effectType < 0.3) {
            // 内外双环
            createBurst(starCount * 0.3, (angle, speedMult) => {
              const star = Star.add(
                x, y, color[0], angle,
                speedMult * speed * 0.5, // 内环速度慢
                starLife
              );
            });
            createBurst(starCount * 0.7, (angle, speedMult) => {
              const star = Star.add(
                x, y, color[1], angle,
                speedMult * speed, // 外环速度正常
                starLife
              );
            });
          } else if (effectType < 0.6) {
            // 交叉双色
            for (let i = 0; i < 2; i++) {
              const colorIndex = i % color.length;
              const rotation = i * Math.PI / 4;

              createStar(starCount / 2, 5, (angle, speedMult) => {
                const star = Star.add(
                  x, y, color[colorIndex], angle,
                  speedMult * speed,
                  starLife + Math.random() * 300
                );
              }, 1.2, rotation);
            }
          } else {
            // 默认的双色爆炸
            createBurst(starCount / 2, starFactory);
            createBurst(starCount / 2, starFactory);
          }
        }
      }// 特殊形状烟花
      else if (specialShape) {
        // 根据特殊形状参数创建不同形状的烟花
        switch (specialShape) {
          case 'heart':
            // 心形烟花，增加方向参数
            createHeart(starCount, starFactory, 1, 0, 0, options.direction || 0);
            break;

          case 'star':
            // 星形烟花
            const rotation = Math.random() * PI_2;
            createStar(starCount, points, starFactory, 1.2, rotation);
            break;

          case 'spiral':
            // 螺旋烟花
            createSpiral(starCount, turns, starFactory);
            break;

          case 'letter':
            // 字母烟花
            const selectedLetter = letter || ['A', 'V', 'O'][Math.floor(Math.random() * 3)];
            createLetter(selectedLetter, starCount, starFactory, 1.2);
            break;

          default:
            // 默认球形爆炸
            createBurst(starCount, starFactory);
        }
      }
      // 多种特效烟花
      else {
        // 随机选择烟花类型
        const effectType = Math.random();

        if (effectType < 0.08 && starCount > 30) {
          // 字母烟花 (8%的概率)
          const letters = ['A', 'V', 'O'];
          const selectedLetter = letters[Math.floor(Math.random() * letters.length)];
          createLetter(selectedLetter, starCount, starFactory, 1.2);
        }
        else if (effectType < 0.16) {
          // 螺旋烟花 (8%的概率)
          const turns = 2 + Math.random() * 2;
          createSpiral(starCount, turns, starFactory);
        }
        else if (effectType < 0.24) {
          // 心形烟花 (8%的概率)
          createHeart(starCount, starFactory);
        }
        else if (effectType < 0.32) {
          // 星形烟花 (8%的概率)
          const points = 5 + Math.floor(Math.random() * 3); // 5-7点星
          const rotation = Math.random() * PI_2;
          createStar(starCount, points, starFactory, 1.2, rotation);
        }
        else if (effectType < 0.40) {
          // 柳树型烟花 (8%的概率)
          createWillow(starCount, starFactory, 1.0);
        }
        else if (effectType < 0.48) {
          // 菊花型烟花 (8%的概率)
          createChrysanthemum(starCount, starFactory, 1.1);
        }
        else if (effectType < 0.56) {
          // 棕榈型烟花 (8%的概率)
          createPalm(starCount, starFactory, 1.0);
        }
        else if (effectType < 0.64) {
          // 马尾型烟花 (8%的概率)
          const direction = Math.random() * PI_2;
          createHorseTail(starCount, starFactory, 1.0, direction);
        }
        else if (effectType < 0.72) {
          // 秃头型烟花 (8%的概率)
          createKamuro(starCount, starFactory, 0.8);
        }
        else {
          // 默认球形爆炸 (28%的概率)
          createBurst(starCount, starFactory);
        }
      }

      // 花心效果
      if (pistil) {
        const pistilCount = Math.round(starCount * 0.4);
        createBurst(pistilCount, (angle, speedMult) => {
          starFactory(angle, speedMult * 0.6);
        });
      }

      // 爆炸闪光
      BurstFlash.add(x, y, spreadSize / 4);

      if (soundEnabled.value) playSound('burst');
    }

    // 创建火箭发射
    function launchRocket(targetX, targetY) {
      const startX = 60 + Math.random() * (width - 120);
      const startY = height;
      const color = randomColor();

      rockets.push(new Rocket(startX, startY, targetX, targetY, color));
    }

    // 随机颜色
    function randomColor() {
      return COLOR_CODES[Math.floor(Math.random() * COLOR_CODES.length)];
    }

    // 初始化画布
    function initCanvas() {
      if (!stageContainer.value || !mainCanvas.value || !trailsCanvas.value) {
        console.error('Canvas elements not found');
        return;
      }

      width = stageContainer.value.offsetWidth;
      height = stageContainer.value.offsetHeight;

      if (width === 0 || height === 0) {
        width = 800;
        height = 600;
      }

      mainCanvas.value.width = width;
      mainCanvas.value.height = height;
      trailsCanvas.value.width = width;
      trailsCanvas.value.height = height;

      mainCanvas.value.style.width = width + 'px';
      mainCanvas.value.style.height = height + 'px';
      trailsCanvas.value.style.width = width + 'px';
      trailsCanvas.value.style.height = height + 'px';

      ctxMain = mainCanvas.value.getContext('2d');
      ctxTrails = trailsCanvas.value.getContext('2d');

      if (!ctxMain || !ctxTrails) {
        console.error('Failed to get canvas context');
        return;
      }

      ctxMain.clearRect(0, 0, width, height);
      ctxTrails.clearRect(0, 0, width, height);

      // 绑定事件
      if (!mainCanvas.value._fireworkBound) {
        mainCanvas.value.addEventListener('click', onCanvasClick);
        mainCanvas.value.addEventListener('touchstart', onCanvasTouch, { passive: false });
        mainCanvas.value._fireworkBound = true;
      }
    }

    // 画布点击事件
    function onCanvasClick(e) {
      const rect = mainCanvas.value.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (mainCanvas.value.width / rect.width);
      const y = (e.clientY - rect.top) * (mainCanvas.value.height / rect.height);
      launchRocket(x, y);
    }

    function onCanvasTouch(e) {
      e.preventDefault();
      if (e.touches && e.touches.length > 0) {
        const rect = mainCanvas.value.getBoundingClientRect();
        const x = (e.touches[0].clientX - rect.left) * (mainCanvas.value.width / rect.width);
        const y = (e.touches[0].clientY - rect.top) * (mainCanvas.value.height / rect.height);
        launchRocket(x, y);
      }
    }

    // 更新粒子系统
    function updateStars(frameTime, lag) {
      const timeStep = frameTime;
      const speed = lag;

      const starDrag = 1 - (1 - Star.airDrag) * speed;
      const starDragHeavy = 1 - (1 - Star.airDragHeavy) * speed;
      const sparkDrag = 1 - (1 - Spark.airDrag) * speed;
      const gAcc = timeStep / 1000 * GRAVITY;

      // 使用颜色名称遍历
      const colorNames = [...Object.keys(COLOR), 'INVISIBLE'];
      colorNames.forEach(colorName => {
        // 更新Stars
        const stars = Star.active[colorName];
        if (!stars) return; // 防止 undefined
        for (let i = stars.length - 1; i >= 0; i--) {
          const star = stars[i];

          star.life -= timeStep;
          if (star.life <= 0) {
            stars.splice(i, 1);
            Star.returnInstance(star);
            if (star.onDeath) star.onDeath(star);
            continue;
          }

          star.prevX = star.x;
          star.prevY = star.y;

          star.x += star.speedX * speed;
          star.y += star.speedY * speed;

          // 应用重力
          let gravity = gAcc;
          if (star.gravityMult) gravity *= star.gravityMult;
          star.speedY += gravity;

          // 应用阻力
          const drag = star.heavy ? starDragHeavy : starDrag;
          const finalDrag = star.dragMult ? drag * star.dragMult : drag;
          star.speedX *= finalDrag;
          star.speedY *= finalDrag;

          // 弧形效果（棕榈型烟花）
          if (star.arcEffect) {
            star.speedX += Math.sin(star.life * 0.01) * star.arcStrength;
          }

          // 亮度衰减
          if (star.fadeRate) {
            star.brightness = (star.brightness || 1) * star.fadeRate;
          }

          // 火花生成
          if (star.sparkFreq) {
            star.sparkTimer -= timeStep;
            if (star.sparkTimer <= 0) {
              star.sparkTimer = star.sparkFreq * Math.random() * 0.75 + star.sparkFreq * 0.25;

              Spark.add(
                star.x, star.y, hexToColorName(star.sparkColor),
                Math.random() * PI_2,
                Math.random() * star.sparkSpeed + star.sparkSpeed * 0.5,
                star.sparkLife + Math.random() * star.sparkLife * star.sparkLifeVariation
              );
            }
          }
        }
        // 更新Sparks
        const sparks = Spark.active[colorName];
        if (!sparks) return; // 防止 undefined
        for (let i = sparks.length - 1; i >= 0; i--) {
          const spark = sparks[i];

          spark.life -= timeStep;
          if (spark.life <= 0) {
            sparks.splice(i, 1);
            Spark.returnInstance(spark);
            continue;
          }

          spark.prevX = spark.x;
          spark.prevY = spark.y;

          spark.x += spark.speedX * speed;
          spark.y += spark.speedY * speed;

          spark.speedY += gAcc;
          spark.speedX *= sparkDrag;
          spark.speedY *= sparkDrag;
        }
      });

      // 更新爆炸闪光
      for (let i = BurstFlash.active.length - 1; i >= 0; i--) {
        const bf = BurstFlash.active[i];
        bf.life--;
        if (bf.life <= 0) {
          BurstFlash.active.splice(i, 1);
          BurstFlash.returnInstance(bf);
        }
      }
    }

    // 绘制粒子系统
    function drawStars() {
      // 清除并设置混合模式
      ctxTrails.globalCompositeOperation = 'source-over';
      ctxTrails.globalAlpha = 0.15;
      ctxTrails.fillStyle = '#000';
      ctxTrails.fillRect(0, 0, width, height);
      ctxTrails.globalCompositeOperation = 'lighten';

      // 绘制爆炸闪光
      ctxMain.globalCompositeOperation = 'lighten';
      ctxMain.fillStyle = '#fff';
      for (let i = 0; i < BurstFlash.active.length; i++) {
        const bf = BurstFlash.active[i];
        const burnRate = bf.life / 6;
        ctxMain.globalAlpha = burnRate;
        ctxMain.beginPath();
        ctxMain.arc(bf.x, bf.y, bf.radius * burnRate, 0, PI_2);
        ctxMain.fill();
      }
      ctxMain.globalCompositeOperation = 'source-over';

      // 绘制Stars轨迹
      ctxTrails.lineWidth = Star.drawWidth;
      ctxTrails.lineCap = 'round';
      ctxMain.strokeStyle = '#fff';
      ctxMain.lineWidth = 1; ctxMain.beginPath();

      // 使用颜色名称而不是十六进制值
      Object.keys(COLOR).forEach(colorName => {
        const stars = Star.active[colorName];
        if (!stars) return; // 防止 undefined

        const colorHex = COLOR[colorName]; // 获取对应的十六进制颜色
        ctxTrails.strokeStyle = colorHex;
        ctxTrails.beginPath();

        stars.forEach(star => {
          if (star.visible !== false) {
            ctxTrails.moveTo(star.x, star.y);
            ctxTrails.lineTo(star.prevX, star.prevY);
            ctxMain.moveTo(star.x, star.y);
            ctxMain.lineTo(star.x - star.speedX * 1.6, star.y - star.speedY * 1.6);
          }
        });
        ctxTrails.stroke();
      });
      ctxMain.stroke();
      // 绘制Sparks
      ctxTrails.lineWidth = Spark.drawWidth;
      Object.keys(COLOR).forEach(colorName => {
        const sparks = Spark.active[colorName];
        if (!sparks) return; // 防止 undefined

        const colorHex = COLOR[colorName]; // 获取对应的十六进制颜色
        ctxTrails.strokeStyle = colorHex;
        ctxTrails.beginPath();

        sparks.forEach(spark => {
          ctxTrails.moveTo(spark.x, spark.y);
          ctxTrails.lineTo(spark.prevX, spark.prevY);
        });
        ctxTrails.stroke();
      });
    }
    // 天空颜色系统
    function colorSky(speed) {
      const maxSkySaturation = 30; // 增加天空颜色饱和度
      const maxStarCount = 400;
      let totalStarCount = 0;
      let weightedR = 0, weightedG = 0, weightedB = 0;

      // 重置目标颜色
      targetSkyColor.r = 0;
      targetSkyColor.g = 0;
      targetSkyColor.b = 0;

      Object.keys(COLOR).forEach(colorName => {
        const stars = Star.active[colorName];
        if (!stars) return;

        const count = stars.length;
        if (count === 0) return;

        totalStarCount += count;

        const colorHex = COLOR[colorName];
        const rgb = hexToRgb(colorHex);
        if (rgb) {
          // 计算颜色权重，考虑粒子亮度和距离
          let colorWeight = 0;
          stars.forEach(star => {
            const brightness = star.brightness || 1;
            const distanceFromCenter = Math.sqrt(
              Math.pow((star.x - width / 2) / width, 2) +
              Math.pow((star.y - height / 2) / height, 2)
            );
            const proximityWeight = Math.max(0, 1 - distanceFromCenter * 0.8);
            colorWeight += brightness * proximityWeight;
          });

          weightedR += rgb.r * colorWeight;
          weightedG += rgb.g * colorWeight;
          weightedB += rgb.b * colorWeight;
        }
      });

      if (totalStarCount > 0) {
        const intensity = Math.min(1, totalStarCount / maxStarCount);
        const maxValue = maxSkySaturation * intensity;

        // 应用颜色混合算法
        const totalWeight = weightedR + weightedG + weightedB;
        if (totalWeight > 0) {
          targetSkyColor.r = Math.min(maxValue, (weightedR / totalWeight) * maxValue);
          targetSkyColor.g = Math.min(maxValue, (weightedG / totalWeight) * maxValue);
          targetSkyColor.b = Math.min(maxValue, (weightedB / totalWeight) * maxValue);
        }

        // 添加环境光效果
        const ambientFactor = 0.1;
        targetSkyColor.r += ambientFactor * intensity * 20;
        targetSkyColor.g += ambientFactor * intensity * 15;
        targetSkyColor.b += ambientFactor * intensity * 25;
      }

      // 更平滑的颜色过渡
      const colorChange = 8; // 减小值让过渡更平滑
      currentSkyColor.r += (targetSkyColor.r - currentSkyColor.r) / colorChange * speed;
      currentSkyColor.g += (targetSkyColor.g - currentSkyColor.g) / colorChange * speed;
      currentSkyColor.b += (targetSkyColor.b - currentSkyColor.b) / colorChange * speed;

      // 应用天空颜色，添加渐变效果
      if (stageContainer.value) {
        const r = Math.floor(currentSkyColor.r);
        const g = Math.floor(currentSkyColor.g);
        const b = Math.floor(currentSkyColor.b);

        // 创建径向渐变背景
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.sqrt(width * width + height * height);

        stageContainer.value.style.background = `
          radial-gradient(circle at ${centerX}px ${centerY}px, 
            rgba(${r}, ${g}, ${b}, 0.3) 0%, 
            rgba(${Math.floor(r * 0.7)}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.7)}, 0.1) 50%, 
            rgba(0, 0, 0, 1) 100%)
        `;
      }
    }

    function hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    }

    // 渲染循环
    function render(timestamp) {
      if (loading.value || !ctxMain || !width || !height) {
        return;
      }

      if (!lastTime) lastTime = timestamp;
      const frameTime = timestamp - lastTime;
      const lag = Math.min(frameTime / 16.67, 3);
      lastTime = timestamp;

      currentFrame++;

      // 自动发射烟花
      if (Math.random() < 0.008) {
        const x = width * (0.1 + Math.random() * 0.8);
        const y = height * (0.3 + Math.random() * 0.4);
        launchRocket(x, y);
      }

      // 更新火箭
      for (let i = rockets.length - 1; i >= 0; i--) {
        const rocket = rockets[i];
        rocket.update();

        if (rocket.exploded) {
          rockets.splice(i, 1);
        }
      }

      // 更新粒子系统
      updateStars(frameTime, lag);

      // 清除主画布
      ctxMain.clearRect(0, 0, width, height);

      // 绘制火箭
      rockets.forEach(rocket => {
        rocket.draw(ctxMain);
      });

      // 绘制粒子系统
      drawStars();

      // 更新天空颜色
      colorSky(lag);

      if (!paused.value) {
        animationId = requestAnimationFrame(render);
      }
    }

    // 音效系统
    const soundFiles = {
      lift: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+L/wm4eBjo=',
      burst: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+L/wm4eBjqm5fW6bSEFl2+z8taUVwcH'
    };

    function playSound(type = 'burst') {
      if (!soundEnabled.value) return;

      try {
        const audio = new Audio(soundFiles[type] || soundFiles.burst);
        audio.volume = 0.3;
        audio.play().catch(() => { });
      } catch (e) {
        // 忽略音频错误
      }
    }

    // 控制函数
    function togglePause() {
      paused.value = !paused.value;
      pauseBtnIcon.value = paused.value ? '#icon-play' : '#icon-pause';
      if (paused.value) {
        cancelAnimationFrame(animationId);
      } else {
        lastTime = 0;
        render();
      }
    }

    function toggleSound() {
      soundEnabled.value = !soundEnabled.value;
      soundBtnIcon.value = soundEnabled.value ? '#icon-sound-on' : '#icon-sound-off';
    }

    function toggleMenu() {
      menuVisible.value = !menuVisible.value;
    }

    // 监视器
    watch(fireworkCount, (newValue) => {
      if (newValue < 10) fireworkCount.value = 10;
      if (newValue > 100) fireworkCount.value = 100;
    });

    // 生命周期
    onMounted(() => {
      loading.value = false;
      loadingStatus.value = 'Ready';

      nextTick(() => {
        setTimeout(() => {
          initCanvas();
          paused.value = false;

          lastTime = 0;
          render();

          // 创建展示烟花
          setTimeout(() => {
            if (width && height) {
              createAdvancedFirework(width * 0.2, height * 0.6, {
                shellSize: 0.8,
                color: 'Red',
                glitter: 'heavy',
                pistil: true
              });

              createAdvancedFirework(width * 0.5, height * 0.5, {
                shellSize: 0.6,
                color: ['Blue', 'White'],
                ring: true
              });

              createAdvancedFirework(width * 0.8, height * 0.7, {
                shellSize: 0.7,
                color: 'Gold',
                glitter: 'medium'
              });
            }
          }, 500);

          window.addEventListener('resize', () => {
            if (!loading.value) {
              const newWidth = stageContainer.value.offsetWidth;
              const newHeight = stageContainer.value.offsetHeight;
              if (newWidth !== width || newHeight !== height) {
                width = newWidth;
                height = newHeight;
                initCanvas();
              }
            }
          });
        }, 100);
      });
    });

    onUnmounted(() => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (mainCanvas.value && mainCanvas.value._fireworkBound) {
        mainCanvas.value.removeEventListener('click', onCanvasClick);
        mainCanvas.value.removeEventListener('touchstart', onCanvasTouch);
        mainCanvas.value._fireworkBound = false;
      }
      window.removeEventListener('resize', () => { });
    });

    return {
      loading,
      loadingStatus,
      menuVisible,
      fireworkCount,
      soundEnabled,
      pauseBtnIcon,
      soundBtnIcon,
      stageContainer,
      canvasContainer,
      trailsCanvas,
      mainCanvas,
      controls,
      togglePause,
      toggleSound,
      toggleMenu
    }
  }
}
</script>

<style scoped>
.container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #000;
}

.loading-init {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  text-align: center;
  z-index: 10;
}

.loading-init__header {
  font-size: 24px;
  margin-bottom: 8px;
}

.loading-init__status {
  font-size: 16px;
}

.stage-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent;
}

canvas {
  position: absolute;
  top: 0;
  left: 0;
  cursor: pointer;
  pointer-events: auto;
  display: block;
  visibility: visible;
}

#main-canvas {
  z-index: 15;
}

#trails-canvas {
  z-index: 14;
}

.controls {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  z-index: 10;
}

.btn {
  width: 40px;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: transform 0.2s;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  backdrop-filter: blur(10px);
}

.btn:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.2);
}

.menu {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 20;
}

.menu-content {
  background: rgba(255, 255, 255, 0.1);
  padding: 24px;
  border-radius: 8px;
  text-align: left;
  width: 300px;
  color: #fff;
}

.menu-item {
  margin-bottom: 16px;
}

.menu-item label {
  display: block;
  margin-bottom: 8px;
  color: #fff;
}

.menu-item input[type="range"] {
  width: 100%;
}

button {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: rgba(255, 255, 255, 0.3);
}

svg {
  display: none;
}
</style>
