// 校验输入是否为二进制（保留旧接口）
export function isValidBinary(bin){
    return isValidForBase(bin, 2)
}

// 通用的进制校验函数：检查 value 是否只包含指定 base 的合法字符
export function isValidForBase(value, base){
    if (value == null) return false
    const val = String(value).trim()
    if (val === '') return false

    let re
    switch (base) {
        case 2:
            re = /^[01]+$/i
            break
        case 8:
            re = /^[0-7]+$/i
            break
        case 10:
            re = /^[0-9]+$/i
            break
        case 16:
            re = /^[0-9a-f]+$/i
            break
        default:
            // 对于不常见的进制，允许 0-9a-z
            if (base >= 2 && base <= 36) {
                const maxChar = base <= 10 ? String(base - 1) : String.fromCharCode(96 + base - 10) // not used directly
                re = new RegExp('^[0-9a-' + String.fromCharCode(86 + base) + ']+$', 'i')
            } else {
                return false
            }
    }

    return re.test(val)
}