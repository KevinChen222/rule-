/**
 * Sub-Store 覆写脚本
 * 功能：将 vmess/vless/trojan/anytls 协议的 client-fingerprint 设置为 firefox
 * 
 * 使用方法：
 * 1. 在 Sub-Store 中添加脚本操作
 * 2. 类型选择「脚本操作」
 * 3. 粘贴此脚本内容或填入脚本链接
 */

function operator(proxies) {
    // 需要处理的协议类型
    const targetTypes = ['vmess', 'vless', 'trojan', 'anytls'];
    
    // 目标指纹值
    const targetFingerprint = 'firefox';
    
    return proxies.map(proxy => {
        // 检查是否为目标协议类型
        if (targetTypes.includes(proxy.type)) {
            // 如果没有 client-fingerprint 字段，或者值不是 firefox，则设置为 firefox
            if (!proxy['client-fingerprint'] || proxy['client-fingerprint'] !== targetFingerprint) {
                return {
                    ...proxy,
                    'client-fingerprint': targetFingerprint
                };
            }
        }
        return proxy;
    });
}
