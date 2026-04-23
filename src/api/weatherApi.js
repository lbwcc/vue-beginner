import axios from 'axios';

// 使用和风天气免费API示例（需注册获取key）
// 你可以在 https://dev.qweather.com/ 注册获取免费key
const API_KEY = '20263ec4ba564a31ae9bb1e0f3155394';
const API_BASE_URL = 'https://my3byemada.re.qweatherapi.com/v7';
const WEATHER_BASE_URL = `${API_BASE_URL}/weather`;

//实时天气
export const getWeatherNow = (location) => {
    return axios.get(`${WEATHER_BASE_URL}/now`, {
        params: {
            location,
            key: API_KEY
        }
    });
};
// 获取未来天气
export const getWeatherForecast = (location, days) => {
    return axios.get(`${WEATHER_BASE_URL}/${days}`, {
        params: {
            location,
            key: API_KEY,
        }
    });
};

// 获取分钟级降水（5分钟）
export const getWeatherMinutely5m = (location) => {
    return axios.get(`${API_BASE_URL}/minutely/5m`, {
        params: {
            location,
            key: API_KEY,
        }
    });
};