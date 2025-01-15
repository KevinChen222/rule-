function operator(proxies) {
    const asiaPortStart = 6554;
    const americaPortStart = 6654;
    const europePortStart = 6754;
    
    // 保存每个地区已分配的端口数量
    const portCounter = {
        asia: 0,
        america: 0,
        europe: 0
    };

    // 地区判断正则表达式
    const regionPatterns = {
        asia: /香港|台湾|日本|新加坡|韩国|印度|泰国|越南|菲律宾|马来西亚|印尼|蒙古/i,
        america: /美国|加拿大|墨西哥|巴西|阿根廷|智利|秘鲁|哥伦比亚/i,
        europe: /英国|法国|德国|意大利|西班牙|葡萄牙|荷兰|比利时|瑞士|瑞典|挪威|芬兰|丹麦|爱尔兰|波兰|俄罗斯|乌克兰/i
    };

    // 获取节点所属地区
    function getRegion(nodeName) {
        for (const [region, pattern] of Object.entries(regionPatterns)) {
            if (pattern.test(nodeName)) {
                return region;
            }
        }
        return 'asia'; // 默认归类为亚洲
    }

    // 获取对应地区的端口号
    function getPort(region) {
        let basePort;
        switch (region) {
            case 'asia':
                basePort = asiaPortStart;
                portCounter.asia++;
                return basePort + portCounter.asia - 1;
            case 'america':
                basePort = americaPortStart;
                portCounter.america++;
                return basePort + portCounter.america - 1;
            case 'europe':
                basePort = europePortStart;
                portCounter.europe++;
                return basePort + portCounter.europe - 1;
        }
    }

    // 处理每个代理节点
    return proxies.map(proxy => {
        if (proxy.type === 'ss') {
            const region = getRegion(proxy.name);
            const newPort = getPort(region);
            
            return {
                ...proxy,
                server: '127.0.0.1',
                port: newPort
            };
        }
        return proxy;
    });
}
