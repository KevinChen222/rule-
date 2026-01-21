/**
 * Sub-Store 覆写脚本
 * 功能：为所有节点添加 dialer-proxy 字段
 * 
 * 用法：脚本链接后添加 #dp=自定义字符
 * 例如：https://xxx/dialer-proxy.js#dp=🚀 前置代理
 * 
 * 参数说明：
 * [dp=] 必填，dialer-proxy 的值
 * [skip=] 可选，跳过包含指定关键词的节点（多个用+连接），例如 skip=直连+DIRECT
 */

const inArg = $arguments;

// 获取参数
const dialerProxy = inArg.dp || inArg.dialerproxy || '';
const skipKeywords = inArg.skip ? inArg.skip.split('+').map(k => k.trim()).filter(Boolean) : [];

function operator(proxies) {
  if (!dialerProxy) {
    console.log('[dialer-proxy] 未设置 dp 参数，跳过处理');
    return proxies;
  }

  return proxies.map(proxy => {
    // 检查是否需要跳过
    const name = proxy.name || '';
    if (skipKeywords.length > 0 && skipKeywords.some(kw => name.includes(kw))) {
      return proxy;
    }

    // 添加 dialer-proxy 字段
    return {
      ...proxy,
      'dialer-proxy': dialerProxy
    };
  });
}
