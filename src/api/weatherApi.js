import axios from 'axios';

// 使用和风天气免费API示例（需注册获取key）
// 你可以在 https://dev.qweather.com/ 注册获取免费key
const API_KEY = '20263ec4ba564a31ae9bb1e0f3155394';
const BASE_URL = 'https://my3byemada.re.qweatherapi.com/v7/weather';

//实时天气
export const getWeatherNow = (location) => {
    return axios.get(`${BASE_URL}/now`, {
        params: {
            location,
            key: API_KEY
        }
    });
};