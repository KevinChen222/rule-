/**
 * Sub-Store 覆写脚本
 * 功能：在节点 name 的第一个国旗符号后插入用户指定前缀 pre
 *
 * 用法：脚本链接后添加 #pre=自定义字符
 * 例如：https://xxx/prename.js#pre=Amy
 *
 * 参数说明：
 * [pre=] 必填，要插入的字符（会自动 trim）
 * [skip=] 可选，跳过包含指定关键词的节点（多个用+连接），例如 skip=直连+DIRECT
 */

const inArg = $arguments;

// 参数
const preRaw = (inArg.pre ?? '').toString();
const pre = preRaw.trim();
const skipKeywords = inArg.skip
  ? inArg.skip.split('+').map(k => k.trim()).filter(Boolean)
  : [];

// 识别国旗符号：由两个 Regional Indicator Symbols 组成
// 例如 🇭🇰 实际是两个码位（代理项对）
const flagRe = /(?:\uD83C[\uDDE6-\uDDFF]){2}/;

function operator(proxies) {
  if (!pre) {
    console.log('[prename] 未设置 pre 参数，跳过处理');
    return proxies;
  }

  return proxies.map(proxy => {
    const name = (proxy && proxy.name ? String(proxy.name) : '');

    // 跳过关键词
    if (skipKeywords.length > 0 && skipKeywords.some(kw => name.includes(kw))) {
      return proxy;
    }

    const m = name.match(flagRe);
    if (!m) {
      // 无国旗符号：不处理
      return proxy;
    }

    const flag = m[0];
    const idx = name.indexOf(flag);
    if (idx < 0) return proxy;

    // 国旗之后的内容（去掉原有前导空格）
    const after = name.slice(idx + flag.length);
    const afterTrimLeft = after.replace(/^\s+/, '');

    // 幂等：如果已经是 “pre + 空格 + ...” 则不重复插入
    const preWithSpace = pre + ' ';
    if (afterTrimLeft === pre || afterTrimLeft.startsWith(preWithSpace)) {
      return proxy;
    }

    // 组装新名字：flag + ' ' + pre + (afterTrimLeft ? ' ' + afterTrimLeft : '')
    const newName = flag + ' ' + pre + (afterTrimLeft ? ' ' + afterTrimLeft : '');

    return { ...proxy, name: newName };
  });
}
