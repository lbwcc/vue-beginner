<template>
    <div class="lottery-container">
        <!-- 返回按钮-->
        <el-button class="back-btn" @click="$router.push('/')">返回</el-button>

        <!-- 模式选择：九宫格 / 轮盘 -->
        <div class="mode-switch">
            <el-radio-group v-model="mode" size="small">
                <el-radio-button value="grid">九宫格抽奖</el-radio-button>
                <el-radio-button value="roulette">轮盘抽奖</el-radio-button>
            </el-radio-group>
        </div>

    <!-- 九宫格抽奖区 -->
    <div v-if="mode === 'grid'" class="box">
            <div class="wheel">
                <div v-for="(item, idx) in gridList" :key="idx" class="grid-item"
                    :class="{ center: idx === 4, active: currentIndex === idx }">
                    <template v-if="idx === 4">
                        <button class="draw-btn" @click="handleDraw" :disabled="isDrawing">
                            立即<br>抽奖
                        </button>
                    </template>
                    <template v-else>
                        <div class="prize-img" :class="item.type"></div>
                        <div class="prize-title">{{ item.title }}</div>
                    </template>
                </div>
            </div>
            <!-- 转盘抽奖 -->

            <!-- 抽奖次数提示区 -->
            <div class="chance-tip">
                您还有 <span class="chance-num">{{ chance }}</span> 次抽奖机会
            </div>
        </div>
    <!-- 轮盘抽奖区 -->
    <div v-if="mode === 'roulette'" class="roulette-container">
            <div class="roulette-area">
                <div class="pointer">▾</div>
                <div ref="wheelRef" class="roulette-wheel" :style="wheelStyle" @transitionend="onWheelEnd">
                    <!-- 使用 conic-gradient 画扇区 -->
                    <div v-for="(seg, i) in wheelSegments" :key="i" class="seg-label" :style="labelStyle(i)">
                        <span :style="labelTextStyle(i)">{{ seg.title }}</span>
                    </div>
                    <button class="start-btn" @click="spinWheel" :disabled="isSpinningWheel">开始</button>
                </div>
            </div>
            <div class="chance-tip wheel-chance">剩余轮盘次数：<span class="chance-num">{{ wheelChance }}</span></div>
        </div>

        <!-- 结果弹窗 -->
        <el-dialog v-model="dialogVisible" title="抽奖结果" width="360px" @close="onDialogClose">
            <div class="dialog-content">
                <p>恭喜获得：{{ dialogPrize }}</p>
            </div>
            <template #footer>
                <el-button @click="dialogVisible = false">关闭</el-button>
            </template>
        </el-dialog>
    </div>
</template>
<script setup>
import { ref, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
const gridList = ref([
    { title: '一等奖', type: 'first-prize' },
    { title: '二等奖', type: 'second-prize' },
    { title: '三等奖', type: 'third-prize' },
    { title: '谢谢参与', type: 'participation' },
    { title: '谢谢参与', type: 'participation' },
    { title: '谢谢参与', type: 'participation' },
    { title: '谢谢参与', type: 'participation' },
    { title: '谢谢参与', type: 'participation' },
    { title: '谢谢参与', type: 'participation' },
])
const currentIndex = ref(-1)
const isDrawing = ref(false)
// 初始抽奖次数（可按需调整）
const chance = ref(3)

// 模式：'grid' 或 'roulette'
const mode = ref('grid')

// Dialog state for showing result
const dialogVisible = ref(false)
const dialogPrize = ref('')

const onDialogClose = () => {
    dialogVisible.value = false
}
// 辅助：所有奖项位置（不含中心索引 4）
// 改为按顺序走 0 -> 1 -> 2 -> 5 -> 8 -> 7 -> 6 -> 3
const prizeIndices = [0, 1, 2, 5, 8, 7, 6, 3]

// 奖项权重（按 title 计算相对概率）
// 说明/假设：一等奖最稀有，二等奖次之，三等奖更常见，其它为安慰奖
const getWeightForIndex = (idx) => {
    const title = gridList.value[idx] && gridList.value[idx].title
    if (title === '一等奖') return 10
    if (title === '二等奖') return 15
    if (title === '三等奖') return 25
    // 默认 "谢谢参与" 或其它
    return 50
}

// 使用加权随机选择（优先使用 crypto.getRandomValues 增强随机性）
const weightedRandomPrizeIndex = () => {
    const weights = prizeIndices.map(i => getWeightForIndex(i))
    const total = weights.reduce((s, w) => s + w, 0)
    let r
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        const arr = new Uint32Array(1)
        window.crypto.getRandomValues(arr)
        r = (arr[0] / 2 ** 32) * total
    } else {
        r = Math.random() * total
    }
    let acc = 0
    for (let i = 0; i < weights.length; i++) {
        acc += weights[i]
        if (r < acc) return prizeIndices[i]
    }
    return prizeIndices[prizeIndices.length - 1]
}

const handleDraw = async () => {
    if (isDrawing.value) return
    if (chance.value <= 0) {
        ElMessage.warning('抽奖次数不足')
        return
    }
    isDrawing.value = true
    // 减少一次机会，保持不为负数
    chance.value = Math.max(0, chance.value - 1)

    // 选择随机奖项位置（在 gridList 中的索引）
    // 使用加权随机，保证大奖更稀有
    const target = weightedRandomPrizeIndex()

    // 确定在 prizeIndices 中的起始位置
    let startPos = 0
    if (currentIndex.value !== -1 && currentIndex.value !== 4) {
        const idx = prizeIndices.indexOf(currentIndex.value)
        startPos = idx >= 0 ? idx : 0
    }

    // 总步数：若干完整循环加上偏移以停在目标位置
    const cycles = Math.floor(Math.random() * 5) + 3 // 3~5 个循环
    const targetPos = prizeIndices.indexOf(target)
    const totalSteps = cycles * prizeIndices.length + ((targetPos - startPos + prizeIndices.length) % prizeIndices.length)

    // 动画：逐步减速
    // 由于 next() 内先执行 step++，需要从 -1 开始以保证第一次高亮为 startPos
    let step = -1
    const minDelay = 60
    const maxDelay = 220

    await new Promise((resolve) => {
        function next() {
            // 先增加步数，再前进到相应的奖项位置（确保最后一步能准确停在目标）
            step++
            const pos = (startPos + step) % prizeIndices.length
            currentIndex.value = prizeIndices[pos]

            // 如果已经达到或超过总步数，则结束动画（此时已高亮目标）
            if (step >= totalSteps) {
                // 强制校准，确保最终高亮为目标位置，避免时序/off-by-one 问题
                currentIndex.value = target
                resolve()
                return
            }

            // 缓动延迟：开始快，结束慢
            const t = step / totalSteps
            const delay = Math.round(minDelay + (maxDelay - minDelay) * Math.pow(t, 2))
            setTimeout(next, delay)
        }
        next()
    })

    // 显示结果（使用 Element Plus Dialog）
    await nextTick()
    const prize = gridList.value[target].title || '未中奖'
    dialogPrize.value = prize
    dialogVisible.value = true

    // 抽奖结束后重置高亮到初始状态
    currentIndex.value = -1
    isDrawing.value = false
}

// --------------- 轮盘相关 ---------------
const wheelRef = ref(null)
// 轮盘扇区（参考上方 gridList，可自定义）
const wheelSegments = ref([
    { title: '牛🐂' },
    { title: '虎🐯' },
    { title: '兔🐰' },
    { title: '龙🐲' },
    { title: '蛇🐍' },
    { title: '马🐎' },
    { title: '羊🐐' },
    { title: '猴🐒' },
    { title: '鸡🐔' },
    { title: '狗🐶' },
    { title: '猪🐷' },
    { title: '鼠🐀' },
])

const wheelChance = ref(2)
const isSpinningWheel = ref(false)
const currentAngle = ref(0)
const targetAngle = ref(0)

const segmentCount = computed(() => wheelSegments.value.length)
const segmentAngle = computed(() => 360 / segmentCount.value)

// helpers: color conversions (hex <-> hsl) and hue shift for generating colors
const hexToRgb = (hex) => {
    const h = hex.replace('#', '').trim()
    if (h.length === 3) {
        return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
    }
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
const rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h, s, l = (max + min) / 2
    if (max === min) { h = s = 0 } else {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break
            case g: h = (b - r) / d + 2; break
            case b: h = (r - g) / d + 4; break
        }
        h /= 6
    }
    return [h * 360, s * 100, l * 100]
}
const hslToCss = (h, s, l) => `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`

const shiftHue = (hex, deg) => {
    try {
        const [r, g, b] = hexToRgb(hex)
        const [h, s, l] = rgbToHsl(r, g, b)
        return hslToCss((h + deg) % 360, s, l)
    } catch (e) {
        return hex
    }
}

// 从主题 CSS 变量读取颜色并生成若干扇区颜色
const getThemeColors = (count) => {
    if (typeof window === 'undefined' || !window.getComputedStyle) {
        // fallback palette
        const palette = ['#ffb3b3', '#ffd8a8', '#fef08a', '#d4f5a9', '#a9e7f5', '#c7b3ff', '#ffb3e6', '#ffd7d3', '#c9f2ff', '#e6e6e6', '#ffe4b3', '#f7d1ff']
        return Array.from({ length: count }, (_, i) => palette[i % palette.length])
    }
    const root = getComputedStyle(document.documentElement)
    const vars = ['--button', '--marked', '--bg-cell', '--bg-main', '--button-text', '--bg-cell-dark']
    const found = []
    for (const v of vars) {
        const val = root.getPropertyValue(v).trim()
        if (val) found.push(val)
    }
    // dedupe
    const uniq = Array.from(new Set(found))
    const colors = []
    if (uniq.length) {
        for (let i = 0; i < count; i++) {
            const base = uniq[i % uniq.length]
            // shift hue progressively to create more variation
            const deg = Math.round((360 / count) * i)
            colors.push(shiftHue(base, deg))
        }
    } else {
        // fallback gradient if no theme vars
        const palette = ['#ffb3b3', '#ffd8a8', '#fef08a', '#d4f5a9', '#a9e7f5', '#c7b3ff', '#ffb3e6', '#ffd7d3', '#c9f2ff', '#e6e6e6', '#ffe4b3', '#f7d1ff']
        for (let i = 0; i < count; i++) colors.push(palette[i % palette.length])
    }
    return colors
}

const wheelColors = computed(() => getThemeColors(segmentCount.value))

const makeConicGradient = (colors) => {
    const step = 360 / colors.length
    const stops = colors.map((c, i) => `${c} ${i * step}deg ${(i + 1) * step}deg`).join(', ')
    return `conic-gradient(${stops})`
}

const wheelStyle = computed(() => {
    const style = {
        transform: `rotate(${currentAngle.value}deg)`,
        transition: isSpinningWheel.value ? 'transform 3s cubic-bezier(.12,.74,.32,1)' : 'none'
    }
    try {
        style.background = makeConicGradient(wheelColors.value)
    } catch (e) {
        // ignore and let CSS fallback apply
    }
    return style
})

// 计算对比色（黑或白），基于相对亮度
const luminance = (hex) => {
    try {
        const [r, g, b] = hexToRgb(hex)
        const srgb = [r, g, b].map(v => v / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
        return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
    } catch (e) {
        return 1
    }
}

const contrastText = (hex) => {
    const L = luminance(hex)
    // WCAG: contrast ratio vs white = (L1+0.05)/(L2+0.05)
    const whiteContrast = (1 + 0.05) / (L + 0.05)
    const blackContrast = (L + 0.05) / (0 + 0.05)
    return whiteContrast >= blackContrast ? '#fff' : '#111'
}

const labelTextStyle = (i) => {
    const c = wheelColors.value[i % wheelColors.value.length]
    // if c is hsl like 'hsl(...)' leave as is, else assume hex
    const colorHex = c.startsWith('hsl') ? c : c
    const angle = i * segmentAngle.value
    return {
        color: contrastText(colorHex),
        fontWeight: 700,
        textShadow: '0 1px 0 rgba(255,255,255,0.12)',
        display: 'inline-block',
        // keep text un-rotated here so it inherits parent's rotation
    }
}

const labelStyle = (i) => {
    // rotate so label aligns with sector middle (bisector)
    const rotate = i * segmentAngle.value + segmentAngle.value / 2
    // use CSS variable --wheel-inner-radius so transform adapts to wheel size
    return {
        left: '50%',
        top: '50%',
        transform: `translate(-50%,-50%) rotate(${rotate}deg) translateY(calc(-1 * var(--wheel-inner-radius) + 18px))`,
        transformOrigin: 'center center'
    }
}

const spinWheel = async () => {
    if (isSpinningWheel.value) return
    if (wheelChance.value <= 0) {
        ElMessage.warning('轮盘次数不足')
        return
    }
    isSpinningWheel.value = true
    wheelChance.value = Math.max(0, wheelChance.value + 1)

    // 随机目标扇区（可改为加权）
    let idx
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        const arr = new Uint32Array(1)
        window.crypto.getRandomValues(arr)
        idx = arr[0] % segmentCount.value
    } else {
        idx = Math.floor(Math.random() * segmentCount.value)
    }

    // 计算目标角度，使其停在指针下方（假设指针在顶部）
    const stopAt = 360 - (idx * segmentAngle.value + segmentAngle.value / 2)
    // 增加若干圈
    const rounds = 4 + Math.floor(Math.random() * 3)
    targetAngle.value = rounds * 360 + stopAt

    // 应用并等待 transitionend 事件处理
    await nextTick()
    currentAngle.value = targetAngle.value
}

const onWheelEnd = (e) => {
    // 归一化角度
    const final = ((targetAngle.value % 360) + 360) % 360
    const landedIdx = Math.floor((360 - final - segmentAngle.value / 2 + 360) % 360 / segmentAngle.value)
    const prize = wheelSegments.value[landedIdx] && wheelSegments.value[landedIdx].title
    dialogPrize.value = prize || '未中奖'
    dialogVisible.value = true
    // 重置状态
    isSpinningWheel.value = false
    // 让视觉角度保持在小于 360 的位置，避免数值无限增大
    currentAngle.value = final
    targetAngle.value = final
}
</script>
<style lang="scss">
.lottery-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 0;

    .back-btn {
        margin-bottom: 12px;
        background-color: var(--button, #39b5b5);
        color: #fff;
        border: none;
        border-radius: 6px;
        padding: 6px 12px;
        cursor: pointer;
        width: 80%;
    }

    .box {
        width: 320px;
        border-radius: 18px;
        padding: 18px;
        background: var(--bg-main-gradient, var(--bg-main, linear-gradient(180deg, #e6f3fb 0%, #d8ecfb 100%)));
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
        position: relative;

        /* inner teal area */
        &::after {
            content: '';
            position: absolute;
            inset: 12px;
            border-radius: 12px;
            /* inner area uses theme bg-cell gradient (generated by applyTheme) */
            background: var(--bg-cell-gradient, linear-gradient(180deg, var(--bg-cell, #0D6E72) 0%, var(--bg-cell-dark, #0B5A5E) 100%));
            z-index: 0;
            box-shadow: inset 0 6px 18px rgba(0, 0, 0, 0.25);
        }

        /* place children above inner background */
        >* {
            position: relative;
            z-index: 1;
        }

        .wheel {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(3, 1fr);
            gap: 12px;
            padding: 12px;
            justify-items: center;
            align-items: center;
        }

        .grid-item {
            width: 84px;
            height: 84px;
            background: var(--cell-bg, #ffffff);
            border-radius: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            box-shadow: 0 6px 10px rgba(0, 0, 0, 0.18), inset 0 6px 10px rgba(255, 255, 255, 0.6);
            color: var(--main-text, #0b6b6f);
            font-size: 13px;
        }

        .grid-item.center {
            background: var(--button, #39b5b5);
            color: var(--button-text, #fff);
            box-shadow: 0 8px 14px rgba(0, 0, 0, 0.25);
        }

        .draw-btn {
            background: transparent;
            border: none;
            color: var(--button-text, #fff);
            font-weight: 700;
            font-size: 16px;
            text-align: center;
            line-height: 1.2;
            padding: 6px 0;
        }

        .prize-img {
            width: 36px;
            height: 36px;
            margin-bottom: 6px;
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
        }

        .prize-title {
            font-size: 12px;
            color: var(--main-text, #0b6b6f);
        }

        .grid-item.active {
            transform: scale(0.98);
            box-shadow: 0 10px 18px rgba(0, 0, 0, 0.12);
            background: var(--marked, #ffe156);
        }

        /* bottom chance bar */
        .chance-tip {
            margin-top: 16px;
            height: 56px;
            border-radius: 12px;
            background: var(--bg-main-gradient, linear-gradient(180deg, var(--bg-main, #e9f3fb) 0%, rgba(255, 255, 255, 0.9) 100%));
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.12);
            font-size: 15px;
            color: var(--main-text, #233);
        }

        .chance-num {
            color: var(--button, #ff4d4f);
            font-weight: 700;
            margin: 0 6px;
            font-size: 18px;
        }
    }

    .mode-switch {
        width: 320px;
        display: flex;
        justify-content: center;
        margin: 8px 0 12px 0;
    }

    /* 轮盘样式 */
    .roulette-container {
        margin-top: 18px;
        width: 350px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .roulette-area {
        --wheel-size: 350px;
        --wheel-radius: calc(var(--wheel-size) / 2);
        --wheel-inner-radius: calc((var(--wheel-size) - 20px) / 2);
        position: relative;
        width: var(--wheel-size);
        height: var(--wheel-size);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .roulette-wheel {
        width: calc(var(--wheel-size) - 20px);
        height: calc(var(--wheel-size) - 20px);
        border-radius: 50%;
        background: var(--roulette-bg, conic-gradient(#eee, #ddd));
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: visible;
    }

    .roulette-wheel::after {
        content: '';
        position: absolute;
        width: 64%;
        height: 64%;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: inset 0 4px 10px rgba(0, 0, 0, 0.06);
        z-index: 3;
    }

    .roulette-wheel .seg-label {
        position: absolute;
        left: 50%;
        top: 50%;
        transform-origin: 0 0;
        width: 88px;
        text-align: center;
        font-size: 12px;
        color: #333;
        z-index: 5;
        pointer-events: none;
    }

    .roulette-wheel .seg-label span {
        display: inline-block;
        transform-origin: center center;
        /* allow wrapping for long labels */
        white-space: normal;
        max-width: 72px;
        padding: 0 4px;
        line-height: 1.2;
        overflow-wrap: anywhere;
        word-break: break-word;
    }

    .roulette-wheel .start-btn {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 20;
        width: 72px;
        height: 72px;
        border-radius: 50%;
        border: none;
        background: linear-gradient(180deg, #fff 0%, #ffd166 100%);
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.15);
        font-weight: 700;
        cursor: pointer;
    }

    .pointer {
        position: absolute;
        top: -8px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 26px;
        z-index: 30;
        color: var(--button, #ff4d4f);
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    /* small separators to simulate spokes */
    .roulette-wheel::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 50%;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06), inset 0 2px 8px rgba(0, 0, 0, 0.06);
        z-index: 2;
        pointer-events: none;
    }

    .wheel-chance {
        margin-top: 8px
    }
}
</style>