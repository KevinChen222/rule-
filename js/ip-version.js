/**
 * 将每个节点裂变为两条：
 * - ipv4：name 加后缀 " v4"
 * - ipv6-prefer：name 加后缀 " v6"
 * 已含 ip-version 的节点保持不变，避免重复裂变
 */
function operator(proxies) {
  const hasSuffix = (name = "") => /\s(v4|v6)$/i.test(name);

  return proxies.flatMap((p) => {
    // 如果已指定 ip-version 或已带 v4/v6 标记，则不重复处理
    if (p["ip-version"] || hasSuffix(p.name || "")) return [p];

    const baseName = p.name || "";
    const v4 = { ...p, "ip-version": "ipv4", name: `${baseName} v4` };
    const v6 = { ...p, "ip-version": "ipv6-prefer", name: `${baseName} v6` };
    return [v4, v6];
  });
}
