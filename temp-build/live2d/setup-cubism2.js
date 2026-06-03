// 將 live2d.min.js（ES Module 格式）的導出掛載到 window
// pixi-live2d-display 需要 window.Live2D 等全局變量
import {
  Live2D,
  Live2DModelWebGL,
  Live2DMotion,
  MotionQueueManager,
  PhysicsHair,
  AMotion,
  UtSystem,
  UtDebug,
} from './live2d.min.js'

window.Live2D = Live2D
window.Live2DModelWebGL = Live2DModelWebGL
window.Live2DMotion = Live2DMotion
window.MotionQueueManager = MotionQueueManager
window.PhysicsHair = PhysicsHair
window.AMotion = AMotion
window.UtSystem = UtSystem
window.UtDebug = UtDebug
