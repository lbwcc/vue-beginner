import http from '@/utils/http.js'
// const appKey= 'ae1718d4587744b0b79f940fbef69e77'
export const getBooksByISBN = (search) => {
    const isProd = process.env.NODE_ENV === 'production';
    const url = isProd
        ? 'https://openlibrary.org/api/books'
        : '/findBooks';
    return http.get(url, {
        params: {
            bibkeys: `ISBN:${search}`,
            format: 'json',
            jscmd: 'data'
        }
    })
}