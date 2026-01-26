/**
 * Sub-Store 覆写脚本
 * 功能：在节点 name 的第一个国旗符号后插入 pre（空格分隔）
 *
 * pre 获取优先级：
 * 1) 参数 pre
 * 2) 字段 _subName
 * 3) 字段 _subDisplayName
 *
 * 用法：
 * - https://xxx/prename.js#pre=Amy
 * - 不传 pre 时，会使用 _subName / _subDisplayName
 */

const inArg = $arguments;

// 识别国旗符号：两个 Regional Indicator Symbols
const flagRe = /(?:\uD83C[\uDDE6-\uDDFF]){2}/;

function toTrimmedString(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function pickPre(proxy) {
  // 1) 参数 pre
  const p1 = toTrimmedString(inArg.pre);
  if (p1) return p1;

  // 2) _subName（注意前面有下划线）
  const p2 = toTrimmedString(proxy?._subName);
  if (p2) return p2;

  // 3) _subDisplayName
  const p3 = toTrimmedString(proxy?._subDisplayName);
  if (p3) return p3;

  return '';
}

function operator(proxies) {
  return proxies.map(proxy => {
    const pre = pickPre(proxy);
    if (!pre) return proxy;

    const name = toTrimmedString(proxy?.name);
    if (!name) return proxy;

    const m = name.match(flagRe);
    if (!m) return proxy;

    const flag = m[0];
    const idx = name.indexOf(flag);
    if (idx < 0) return proxy;

    // 国旗之后的内容（去掉前导空格）
    const after = name.slice(idx + flag.length);
    const afterTrimLeft = after.replace(/^\s+/, '');

    // 幂等：如果已经存在 “pre ” 或等于 “pre” 则不重复插入
    const preWithSpace = pre + ' ';
    if (afterTrimLeft === pre || afterTrimLeft.startsWith(preWithSpace)) {
      return proxy;
    }

    // 新 name：flag + ' ' + pre + (afterTrimLeft ? ' ' + afterTrimLeft : '')
    const newName = flag + ' ' + pre + (afterTrimLeft ? ' ' + afterTrimLeft : '');

    return { ...proxy, name: newName };
  });
}
