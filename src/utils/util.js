export function isValidBinary(bin){
    //校验输入内容是否为二进制
    let decReg = /[^01]+$/;//^在括号里面是求非
    if(!decReg.test(bin)){
        return true
    }else{
        return false;
    }
}