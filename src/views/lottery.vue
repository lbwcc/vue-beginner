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

            <!-- 抽奖次数提示区 -->
            <div class="chance-tip">
                您还有 <span class="chance-num">{{ chance }}</span> 次抽奖机会
            </div>
        </div>

        <!-- 轮盘抽奖区 -->
        <!-- 轮盘抽奖区 -->
        <div v-if="mode === 'roulette'" class="roulette-container">
            <div class="roulette-area">
                <div class="pointer">▾</div>
                <div 
                    ref="wheelRef" 
                    class="roulette-wheel" 
                    :class="{ dragging: isDragging, spinning: isSpinningWheel }"
                    :style="wheelStyle" 
                    @transitionend="onWheelEnd"
                    @mousedown="onDragStart"
                    @touchstart="onDragStart"
                >
                    <!-- 使用 conic-gradient 画扇区 -->
                    <div v-for="(seg, i) in wheelSegments" :key="i" class="seg-label" :style="labelStyle(i)">
                        <span :style="labelTextStyle(i)">{{ seg.title }}</span>
                    </div>
                    <div class="center-hint">
                        <div class="hint-icon">🎯</div>
                        <div class="hint-text">拖动旋转</div>
                    </div>
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
import { ref, nextTick, computed, onUnmounted } from 'vue'
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

// 拖动相关状态
const isDragging = ref(false)
const dragStartAngle = ref(0)
const dragStartPos = ref({ x: 0, y: 0 })
const lastDragAngle = ref(0)
const dragAngles = ref([]) // 记录拖动轨迹用于计算速度
const dragTimestamps = ref([])

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
        transition: (isSpinningWheel.value && !isDragging.value) ? 'transform 4s cubic-bezier(0.12, 0.74, 0.32, 1)' : 'none'
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
    // 默认使用深色文字配白色阴影，确保在各种背景下可见
    return {
        color: '#222',
        fontWeight: 800,
        fontSize: 'clamp(11px, 2.8vw, 15px)',
        textShadow: '0 0 6px rgba(255,255,255,0.95), 0 1px 3px rgba(0,0,0,0.6), 0 0 2px rgba(255,255,255,0.8)',
        display: 'inline-block',
        whiteSpace: 'nowrap'
    }
}

const labelStyle = (i) => {
    // rotate so label aligns with sector middle (bisector)
    const rotate = i * segmentAngle.value + segmentAngle.value / 2
    // 使用固定距离将标签放置在扇区中间位置
    // 轮盘半径大约是 (wheel-size - 24px) / 2，标签放在 65% 的半径处
    const distance = 'calc((var(--wheel-size) - 24px) * 0.32)' // 约 65% 半径
    return {
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) rotate(${rotate}deg) translateY(calc(-1 * ${distance}))`,
        transformOrigin: 'center center'
    }
}

// 计算角度：从轮盘中心到指定点的角度
const getAngleFromCenter = (clientX, clientY) => {
    if (!wheelRef.value) return 0
    const rect = wheelRef.value.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const deltaX = clientX - centerX
    const deltaY = clientY - centerY
    // atan2 返回弧度，转换为角度，并调整为 0-360
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)
    angle = angle + 90 // 调整起始点为顶部
    if (angle < 0) angle += 360
    return angle
}

// 开始拖动
const onDragStart = (e) => {
    if (isSpinningWheel.value) return
    
    e.preventDefault()
    isDragging.value = true
    
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY
    
    dragStartAngle.value = getAngleFromCenter(clientX, clientY)
    lastDragAngle.value = currentAngle.value
    dragStartPos.value = { x: clientX, y: clientY }
    
    // 清空速度记录
    dragAngles.value = [currentAngle.value]
    dragTimestamps.value = [Date.now()]
    
    // 添加全局事件监听
    if (e.type.includes('touch')) {
        document.addEventListener('touchmove', onDragMove, { passive: false })
        document.addEventListener('touchend', onDragEnd)
    } else {
        document.addEventListener('mousemove', onDragMove)
        document.addEventListener('mouseup', onDragEnd)
    }
}

// 拖动中
const onDragMove = (e) => {
    if (!isDragging.value) return
    
    e.preventDefault()
    
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY
    
    const currentDragAngle = getAngleFromCenter(clientX, clientY)
    let deltaAngle = currentDragAngle - dragStartAngle.value
    
    // 处理跨越 0/360 度的情况
    if (deltaAngle > 180) deltaAngle -= 360
    if (deltaAngle < -180) deltaAngle += 360
    
    currentAngle.value = lastDragAngle.value + deltaAngle
    
    // 记录轨迹用于计算速度（保留最近10个点）
    const now = Date.now()
    dragAngles.value.push(currentAngle.value)
    dragTimestamps.value.push(now)
    
    if (dragAngles.value.length > 10) {
        dragAngles.value.shift()
        dragTimestamps.value.shift()
    }
}

// 结束拖动
const onDragEnd = async (e) => {
    if (!isDragging.value) return
    
    isDragging.value = false
    
    // 移除全局事件监听
    if (e.type.includes('touch')) {
        document.removeEventListener('touchmove', onDragMove)
        document.removeEventListener('touchend', onDragEnd)
    } else {
        document.removeEventListener('mousemove', onDragMove)
        document.removeEventListener('mouseup', onDragEnd)
    }
    
    // 计算拖动速度（角度/毫秒）
    let velocity = 0
    if (dragAngles.value.length >= 2) {
        const timeSpan = dragTimestamps.value[dragTimestamps.value.length - 1] - dragTimestamps.value[0]
        if (timeSpan > 0) {
            const angleSpan = dragAngles.value[dragAngles.value.length - 1] - dragAngles.value[0]
            velocity = angleSpan / timeSpan // 角度/毫秒
        }
    }
    
    // 根据速度决定是否抽奖
    const minVelocity = 0.3 // 最小速度阈值（角度/毫秒）
    const absVelocity = Math.abs(velocity)
    
    if (absVelocity < minVelocity) {
        ElMessage.info('拖动速度太慢，请快速滑动转盘')
        return
    }
    
    if (wheelChance.value <= 0) {
        ElMessage.warning('轮盘次数不足')
        return
    }
    
    // 开始惯性旋转抽奖
    spinWithVelocity(velocity)
}

// 根据速度惯性旋转
const spinWithVelocity = async (velocity) => {
    // 随机目标扇区
    let idx
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        const arr = new Uint32Array(1)
        window.crypto.getRandomValues(arr)
        idx = arr[0] % segmentCount.value
    } else {
        idx = Math.floor(Math.random() * segmentCount.value)
    }
    
    // 计算目标角度
    const stopAt = 360 - (idx * segmentAngle.value + segmentAngle.value / 2)
    
    // 根据速度计算旋转圈数（速度越快圈数越多）
    const absVelocity = Math.abs(velocity)
    const baseRounds = 3
    const velocityRounds = Math.min(Math.floor(absVelocity * 3), 5) // 最多额外5圈
    const rounds = baseRounds + velocityRounds
    
    const normalizedCurrent = ((currentAngle.value % 360) + 360) % 360
    const finalTarget = rounds * 360 + stopAt
    
    // 设置动画
    isSpinningWheel.value = false
    await nextTick()
    
    currentAngle.value = normalizedCurrent
    targetAngle.value = normalizedCurrent
    
    if (wheelRef.value) {
        wheelRef.value.offsetHeight
    }
    
    await nextTick()
    
    isSpinningWheel.value = true
    wheelChance.value = Math.max(0, wheelChance.value - 1)
    
    await nextTick()
    
    targetAngle.value = normalizedCurrent + finalTarget
    currentAngle.value = targetAngle.value
}

const onWheelEnd = (e) => {
    // 只在转盘自身的 transform 过渡结束时才处理
    if (!isSpinningWheel.value) return
    if (e.propertyName !== 'transform') return
    if (e.target !== wheelRef.value) return
    
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

// 组件卸载时清理事件监听
onUnmounted(() => {
    // 移除可能残留的事件监听
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)
    document.removeEventListener('touchmove', onDragMove)
    document.removeEventListener('touchend', onDragEnd)
})
</script>
<style lang="scss" scoped>
// ========== 全局样式变量 ==========
.lottery-container {
    --lottery-padding: clamp(12px, 4vw, 24px);
    --lottery-gap: clamp(6px, 2vw, 12px);
    --lottery-radius: clamp(8px, 2vw, 18px);
    --lottery-max-width: min(95vw, 380px);
    
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    min-height: 100vh;
    padding: var(--lottery-padding);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -webkit-text-size-adjust: 100%;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    background: var(--bg-page, linear-gradient(to bottom, #f5f5f5, #e8e8e8));
}

// ========== 返回按钮 ==========
.back-btn {
    width: var(--lottery-max-width);
    min-height: 44px;
    margin-bottom: var(--lottery-gap);
    padding: 10px 20px;
    background: var(--button, #39b5b5);
    color: var(--button-text, #ffffff);
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    -webkit-tap-highlight-color: transparent;
    -webkit-appearance: none;

    &:hover {
        filter: brightness(1.1);
        transform: translateY(-1px);
    }

    &:active {
        filter: brightness(0.95);
        transform: translateY(0);
    }
}

// ========== 模式切换 ==========
.mode-switch {
    width: var(--lottery-max-width);
    display: flex;
    justify-content: center;
    margin-bottom: calc(var(--lottery-gap) * 1.5);
    
    :deep(.el-radio-group) {
        display: flex;
        gap: 8px;
    }

    :deep(.el-radio-button) {
        flex: 1;
    }
}

// ========== 九宫格抽奖容器 ==========
.box {
    width: var(--lottery-max-width);
    max-width: 100%;
    background: var(--bg-main-gradient, linear-gradient(135deg, #e6f3fb 0%, #d8ecfb 100%));
    border-radius: var(--lottery-radius);
    padding: calc(var(--lottery-padding) * 1.2);
    box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.12),
        0 2px 8px rgba(0, 0, 0, 0.08);
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    box-sizing: border-box;

    // 内部背景层
    &::before {
        content: '';
        position: absolute;
        inset: 12px;
        background: var(--bg-cell-gradient, linear-gradient(135deg, #0D6E72 0%, #0B5A5E 100%));
        border-radius: calc(var(--lottery-radius) - 6px);
        box-shadow: inset 0 4px 16px rgba(0, 0, 0, 0.3);
        z-index: 0;
    }

    > * {
        position: relative;
        z-index: 1;
    }
}

// ========== 九宫格网格 ==========
.wheel {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: var(--lottery-gap);
    aspect-ratio: 1;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    place-items: stretch;
}

// ========== 九宫格单元格 ==========
.grid-item {
    background: var(--cell-bg, #ffffff);
    border-radius: clamp(6px, 1.5vw, 10px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: clamp(6px, 2vw, 10px);
    box-shadow: 
        0 4px 12px rgba(0, 0, 0, 0.15),
        inset 0 2px 8px rgba(255, 255, 255, 0.5);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: default;
    position: relative;
    overflow: hidden;
    min-height: 0;
    min-width: 0;

    // 高亮动画
    &.active {
        background: var(--marked, linear-gradient(135deg, #ffe156 0%, #ffd700 100%));
        transform: scale(0.96);
        box-shadow: 
            0 6px 20px rgba(255, 225, 86, 0.4),
            inset 0 2px 8px rgba(255, 255, 255, 0.6);
    }

    // 中心抽奖按钮格子
    &.center {
        background: var(--button, linear-gradient(135deg, #39b5b5 0%, #2a8f8f 100%));
        box-shadow: 
            0 6px 16px rgba(57, 181, 181, 0.4),
            inset 0 2px 8px rgba(255, 255, 255, 0.2);
    }
}

// ========== 抽奖按钮 ==========
.draw-btn {
    width: 100%;
    height: 100%;
    background: transparent;
    border: none;
    color: var(--button-text, #ffffff);
    font-size: clamp(13px, 3.5vw, 16px);
    font-weight: 700;
    line-height: 1.3;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    transition: opacity 0.2s;
    -webkit-tap-highlight-color: transparent;
    -webkit-appearance: none;

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    &:active:not(:disabled) {
        opacity: 0.85;
    }
}

// ========== 奖品图标 ==========
.prize-img {
    width: clamp(26px, 8vw, 40px);
    height: clamp(26px, 8vw, 40px);
    margin-bottom: clamp(2px, 1vw, 6px);
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    flex-shrink: 0;

    // 奖品类型图标（可自定义背景图）
    &.first-prize {
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FFD700"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>');
    }

    &.second-prize {
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23C0C0C0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>');
    }

    &.third-prize {
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23CD7F32"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>');
    }

    &.participation {
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2399ccff"><circle cx="12" cy="12" r="10"/></svg>');
    }
}

// ========== 奖品标题 ==========
.prize-title {
    color: var(--main-text, #0b6b6f);
    font-size: clamp(10px, 2.5vw, 12px);
    font-weight: 600;
    text-align: center;
    line-height: 1.3;
    word-break: keep-all;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
}

// ========== 抽奖次数提示 ==========
.chance-tip {
    width: 100%;
    min-height: clamp(44px, 10vw, 56px);
    margin-top: calc(var(--lottery-gap) * 1.5);
    padding: 12px;
    background: var(--bg-main-gradient, linear-gradient(135deg, #e9f3fb 0%, rgba(255, 255, 255, 0.95) 100%));
    border-radius: clamp(8px, 2vw, 12px);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: clamp(13px, 3vw, 15px);
    font-weight: 500;
    color: var(--main-text, #333333);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

    .chance-num {
        color: var(--button, #ff4d4f);
        font-size: clamp(16px, 4vw, 20px);
        font-weight: 700;
        margin: 0 4px;
    }
}

// ========== 轮盘抽奖容器 ==========
.roulette-container {
    width: var(--lottery-max-width);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: calc(var(--lottery-gap) * 1.5);
}

// ========== 轮盘区域 ==========
.roulette-area {
    --wheel-size: min(90vw, 360px);
    --wheel-inner-radius: calc(var(--wheel-size) / 2 - 12px);
    
    position: relative;
    width: var(--wheel-size);
    height: var(--wheel-size);
    display: flex;
    align-items: center;
    justify-content: center;
}

// ========== 轮盘指针 ==========
.pointer {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    font-size: clamp(24px, 6vw, 32px);
    color: var(--button, #ff4d4f);
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    z-index: 100;
    filter: drop-shadow(0 4px 8px rgba(255, 77, 79, 0.3));
}

// ========== 轮盘转盘 ==========
.roulette-wheel {
    width: calc(var(--wheel-size) - 24px);
    height: calc(var(--wheel-size) - 24px);
    border-radius: 50%;
    position: relative;
    background: radial-gradient(circle, #f5f5f5 0%, #e0e0e0 100%);
    box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.2),
        inset 0 0 0 2px rgba(255, 255, 255, 0.5);
    
    // 硬件加速
    transform: translateZ(0);
    will-change: transform;
    // transition 由 wheelStyle 动态控制，不在此处设置
    
    // 拖动状态
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    transition: box-shadow 0.2s ease;
    
    &.dragging {
        cursor: grabbing;
        box-shadow: 
            0 12px 40px rgba(0, 0, 0, 0.3),
            inset 0 0 0 2px rgba(255, 255, 255, 0.6);
    }
    
    &.spinning {
        cursor: not-allowed;
        pointer-events: none;
    }

    // 中心白色圆
    &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 60%;
        height: 60%;
        background: radial-gradient(circle, #ffffff 0%, #f8f8f8 100%);
        border-radius: 50%;
        box-shadow: 
            0 0 0 2px rgba(0, 0, 0, 0.05),
            inset 0 2px 8px rgba(0, 0, 0, 0.08);
        z-index: 10;
    }

    // 边缘装饰
    &::before {
        content: '';
        position: absolute;
        inset: -2px;
        border-radius: 50%;
        background: linear-gradient(45deg, 
            rgba(255, 255, 255, 0.8) 0%, 
            rgba(255, 255, 255, 0.2) 50%,
            rgba(0, 0, 0, 0.1) 100%);
        z-index: -1;
    }
}

// ========== 轮盘标签 ==========
.seg-label {
    // position, left, top, transform 由内联样式控制
    text-align: center;
    pointer-events: none;
    z-index: 15;
    width: max-content;

    span {
        display: inline-block;
        max-width: 100px;
        padding: 2px 4px;
        line-height: 1.2;
        white-space: nowrap;
        overflow: visible;
        text-overflow: clip;
        // 文字样式由内联样式控制
    }
}

// ========== 轮盘中心提示 ==========
.center-hint {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    pointer-events: none;
    transition: opacity 0.3s ease;
    
    .roulette-wheel.dragging &,
    .roulette-wheel.spinning & {
        opacity: 0.3;
    }
    
    .hint-icon {
        font-size: clamp(28px, 7vw, 40px);
        line-height: 1;
        animation: pulse 2s ease-in-out infinite;
    }
    
    .hint-text {
        font-size: clamp(12px, 3vw, 14px);
        font-weight: 600;
        color: #666;
        text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
        white-space: nowrap;
    }
}

@keyframes pulse {
    0%, 100% {
        transform: scale(1);
        opacity: 0.8;
    }
    50% {
        transform: scale(1.1);
        opacity: 1;
    }
}

// ========== 轮盘次数提示 ==========
.wheel-chance {
    width: 100%;
}

// ========== 响应式优化 ==========
@media (max-width: 480px) {
    .lottery-container {
        --lottery-max-width: min(98vw, 340px);
        padding: 10px;
    }
    
    .box {
        padding: calc(var(--lottery-padding) * 1);
    }

    .roulette-area {
        --wheel-size: min(92vw, 320px);
    }
    
    .seg-label span {
        max-width: 70px;
        padding: 2px 3px;
        font-size: clamp(9px, 2.2vw, 12px);
    }
}

@media (max-width: 360px) {
    .lottery-container {
        --lottery-padding: 8px;
        --lottery-gap: 6px;
        --lottery-max-width: min(100vw, 320px);
        padding: 8px;
    }
    
    .box {
        padding: var(--lottery-padding);
    }

    .box::before {
        inset: 8px;
    }
    
    .roulette-area {
        --wheel-size: min(95vw, 300px);
    }
}

// ========== 弹窗样式 ==========
:deep(.el-dialog) {
    border-radius: 16px;
    overflow: hidden;

    .dialog-content {
        padding: 24px;
        text-align: center;
        font-size: 16px;
        line-height: 1.6;
    }
}
</style>