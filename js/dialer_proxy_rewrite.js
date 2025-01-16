function operator(proxies) {
    // 地区判断正则表达式，有些地区没有覆盖，比如澳大利亚啥的，你可以复制脚本内容自己添加
    const regionPatterns = {
        asia: /香港|台湾|日本|新加坡|韩国|印度|泰国|越南|菲律宾|马来西亚|印尼|蒙古|澳门|尼泊尔|柬埔寨|老挝|文莱|阿联酋|沙特|阿曼|以色列|土耳其|伊朗|约旦/i,
        america: /美国|加拿大|墨西哥|巴西|阿根廷|智利|秘鲁|哥伦比亚|委内瑞拉|巴拿马|哥斯达黎加|乌拉圭|巴拉圭|玻利维亚|厄瓜多尔/i,
        europe: /英国|法国|德国|意大利|西班牙|葡萄牙|荷兰|比利时|瑞士|瑞典|挪威|芬兰|丹麦|爱尔兰|波兰|俄罗斯|乌克兰|奥地利|捷克|希腊|匈牙利|罗马尼亚|保加利亚|克罗地亚/i
    };

    // 获取节点所属地区
    function getRegion(nodeName) {
        // 转换为小写进行匹配
        const lowerName = nodeName.toLowerCase();
        
        // 优先匹配完整地区名称
        for (const [region, pattern] of Object.entries(regionPatterns)) {
            if (pattern.test(nodeName)) {
                return region;
            }
        }

        // 如果没有明确匹配，通过关键词判断
        if (lowerName.includes('asia') || lowerName.includes('亚')) {
            return 'asia';
        }
        if (lowerName.includes('america') || lowerName.includes('美')) {
            return 'america';
        }
        if (lowerName.includes('europe') || lowerName.includes('欧')) {
            return 'europe';
        }

        // 默认归类为亚洲（按地理位置就近原则）
        return 'asia';
    }

    // 获取对应地区的 dialer-proxy 值
    function getDialerProxy(region) {
        const dialerMap = {
            'asia': '亚洲跳板',
            'america': '美洲跳板',
            'europe': '欧洲跳板'
        };
        return dialerMap[region];
    }

    // 处理每个代理节点
    return proxies.map(proxy => {
        const region = getRegion(proxy.name);
        return {
            ...proxy,
            'dialer-proxy': getDialerProxy(region)
        };
    });
}
